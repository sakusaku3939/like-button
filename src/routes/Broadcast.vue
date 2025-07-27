<template>
  <div class="broadcast-container">
    <div class="video-container">
      <video
          ref="localVideo"
          autoplay
          muted
          playsinline
          class="local-video"
      ></video>
    </div>

    <div class="controls">
      <button
          @click="startCamera"
          :disabled="cameraStarted"
          class="btn btn-primary"
      >
        カメラ開始
      </button>

      <button
          @click="startBroadcast"
          :disabled="!cameraStarted || broadcasting"
          class="btn btn-success"
      >
        {{ broadcasting ? "配信中..." : "配信開始" }}
      </button>

      <button
          @click="stopBroadcast"
          :disabled="!broadcasting"
          class="btn btn-danger"
      >
        配信停止
      </button>
    </div>

    <div v-if="broadcasting" class="broadcast-info">
      <div class="status-card">
        <h3>📺 配信中</h3>
        <p>状態: {{ connectionStatus }}</p>
        <p v-if="viewerCount > 0">視聴者数: {{ viewerCount }}人</p>
        <p v-else>視聴者を待機中...</p>
      </div>
    </div>
  </div>
</template>

<script>
import {rtcConfiguration} from "@/config/webrtc-config";
import {
  ref,
  set,
  push,
  onValue,
  remove,
  getDatabase,
} from "firebase/database";

const database = getDatabase();

export default {
  name: "Broadcast",
  data() {
    return {
      localStream: null,
      peerConnection: null,
      cameraStarted: false,
      broadcasting: false,
      connectionStatus: "未接続",
      viewerCount: 0,
      listeners: [], // onValue の解除関数を格納
    };
  },

  async mounted() {
    // ページ離脱時の処理
    window.addEventListener("beforeunload", this.cleanup);
    window.addEventListener("pagehide", this.cleanup, {once: true});
  },

  beforeUnmount() {
    this.cleanup();
    window.removeEventListener("beforeunload", this.cleanup);
    window.removeEventListener("pagehide", this.cleanup);
  },

  methods: {
    async startCamera() {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: {width: 1280, height: 720},
          audio: true,
        });

        this.$refs.localVideo.srcObject = this.localStream;
        this.cameraStarted = true;
        console.log("カメラ開始成功");
      } catch (error) {
        console.error("カメラアクセスエラー:", error);
        alert("カメラにアクセスできませんでした");
      }
    },

    async startBroadcast() {
      if (!this.localStream) {
        alert("まずカメラを開始してください");
        return;
      }

      try {
        // WebRTC PeerConnection作成
        this.peerConnection = new RTCPeerConnection(rtcConfiguration);

        // ローカルストリームを追加
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });

        // ルーム初期化（既存のルームとシグナリングをクリア）
        const roomRef = ref(database, `room`);
        await set(roomRef, {
          broadcaster: true,
          status: "live",
          started: Date.now(),
          offer: null,
          answer: null,
        });
        await set(ref(database, `room/offerCandidates`), null);
        await set(ref(database, `room/answerCandidates`), null);

        // ICE候補の収集（配信者 → 視聴者）
        this.peerConnection.onicecandidate = async (event) => {
          if (event.candidate) {
            const candidatesRef = ref(database, `room/offerCandidates`);
            await push(candidatesRef, {
              candidate: event.candidate.toJSON(),
              timestamp: Date.now(),
            });
          }
        };

        // 接続状態の監視
        this.peerConnection.onconnectionstatechange = () => {
          this.connectionStatus = this.peerConnection.connectionState;
        };

        this.peerConnection.oniceconnectionstatechange = () => {
          // 必要ならログ出力等
        };

        // Answerの監視を開始
        this.listenForAnswer();

        // 視聴者監視開始
        this.listenForViewers();

        // Answer候補監視開始（視聴者 → 配信者）
        this.listenForAnswerCandidates();

        this.broadcasting = true;
        this.connectionStatus = "視聴者待ち";

        console.log("配信開始完了");
      } catch (error) {
        console.error("配信開始エラー:", error);
        alert("配信開始に失敗しました: " + error.message);
      }
    },

    async listenForAnswer() {
      const answerRef = ref(database, `room/answer`);

      const unsubscribe = onValue(answerRef, async (snapshot) => {
        const answerData = snapshot.val();

        if (answerData && answerData.type && answerData.type !== "join-request") {
          console.log("Answer受信:", answerData);

          try {
            // Remote descriptionを毎回セット（再交渉を妨げない）
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(answerData)
            );

            console.log("Answer設定完了");
          } catch (error) {
            console.error("Answer設定エラー:", error);
          }
        } else if (answerData && answerData.type === "join-request") {
          console.log("視聴者参加要求受信");
          // 新しい視聴者に対応するため、古い Offer/候補をクリアしてから Offer 作成
          try {
            await set(ref(database, `room/offer`), null);
            await set(ref(database, `room/offerCandidates`), null);

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            // OfferをRealtime Databaseに保存（タイムスタンプ付き）
            const offerRef = ref(database, `room/offer`);
            await set(offerRef, {
              type: offer.type,
              sdp: offer.sdp,
              timestamp: Date.now(),
            });

            console.log("Offer送信完了");
          } catch (error) {
            console.error("Offer作成エラー:", error);
          }
        }
      });

      this.listeners.push(unsubscribe);
    },

    listenForAnswerCandidates() {
      const candidatesRef = ref(database, `room/answerCandidates`);

      const unsubscribe = onValue(candidatesRef, (snapshot) => {
        const candidates = snapshot.val();
        if (candidates) {
          Object.values(candidates).forEach(async (candidateData) => {
            if (candidateData && candidateData.candidate) {
              try {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidateData.candidate)
                );
              } catch (error) {
                console.error("ICE候補追加エラー:", error);
              }
            }
          });
        }
      });

      this.listeners.push(unsubscribe);
    },

    listenForViewers() {
      const viewersRef = ref(database, `room/viewers`);

      const unsubscribe = onValue(viewersRef, (snapshot) => {
        const viewers = snapshot.val();
        this.viewerCount = viewers ? Object.keys(viewers).length : 0;
      });

      this.listeners.push(unsubscribe);
    },

    async stopBroadcast() {
      try {
        await this.cleanup();

        // UI状態リセット
        this.broadcasting = false;
        this.connectionStatus = "未接続";
        this.viewerCount = 0;

        console.log("配信停止完了");
      } catch (error) {
        console.error("配信停止エラー:", error);
      }
    },

    async cleanup() {
      // リスナー解除（保存した解除関数を呼ぶ）
      this.listeners.forEach((unsub) => {
        try {
          if (typeof unsub === "function") unsub();
        } catch (error) {
          console.error("リスナー解除エラー:", error);
        }
      });
      this.listeners = [];

      // WebRTC接続終了
      if (this.peerConnection) {
        try {
          this.peerConnection.onicecandidate = null;
          this.peerConnection.onconnectionstatechange = null;
          this.peerConnection.oniceconnectionstatechange = null;
          this.peerConnection.close();
        } catch (e) {
          // close() は既に終了済み等で例外になることがあるが実害はないため無視
          console.debug("peerConnection.close() を無視:", e);
        }
        this.peerConnection = null;
      }

      // カメラストリーム停止
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
        this.cameraStarted = false;
      }

      // Realtime Databaseルーム削除
      try {
        const roomRef = ref(database, `room`);
        await remove(roomRef);
      } catch (error) {
        console.error("ルーム削除エラー:", error);
      }
    },
  },
};
</script>

<style scoped>
.broadcast-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.video-container {
  margin-bottom: 20px;
  text-align: center;
}

.local-video {
  width: 100%;
  max-width: 640px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #1e7e34;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}

.broadcast-info {
  display: flex;
  justify-content: center;
}

.status-card {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #dee2e6;
  min-width: 250px;
}

.status-card h3 {
  margin: 0 0 10px 0;
  color: #007bff;
}

.status-card p {
  margin: 5px 0;
  color: #6c757d;
}

@media screen and (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: center;
  }

  .btn {
    width: 200px;
  }

  .broadcast-container {
    padding: 16px;
  }
}
</style>
