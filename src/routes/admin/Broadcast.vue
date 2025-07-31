<template>
  <div id="app">
    <h1>ライブ配信</h1>

    <div v-if="alreadyBroadcasting" class="broadcast-info">
      <div class="status-card">
        <h3>🚫 配信中のため操作できません</h3>
        <p>この端末では新しい配信を開始できません。</p>

        <button
            @click="stopBroadcast"
            class="btn btn-danger">
          全ての配信を停止
        </button>
      </div>
    </div>

    <p>①「配信開始」をクリックしてカメラを起動し、ライブ配信を開始します。</p>
    <p>②
      <router-link to="/Live" target="_blank">発表画面（Live）</router-link>
      に移動し、プロジェクターなどで画面を投影します。
    </p>

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
            @click="startBroadcast"
            :disabled="broadcasting || alreadyBroadcasting"
            class="btn btn-success">
          {{ broadcasting ? "配信中..." : "配信開始" }}
        </button>

        <button
            @click="stopBroadcast"
            :disabled="!broadcasting || alreadyBroadcasting"
            class="btn btn-danger">
          配信停止
        </button>
      </div>

      <div v-if="broadcasting && !alreadyBroadcasting" class="broadcast-info">
        <div class="status-card">
          <h3>📺 配信中</h3>
          <p>状態: {{ connectionStatus }}</p>
          <p v-if="viewerCount > 0">視聴者数: {{ viewerCount }}人</p>
          <p v-else>視聴者を待機中...</p>
        </div>
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
  getDatabase, get,
} from "firebase/database";
import sw from "@/common/switch-scroll";

const database = getDatabase();

export default {
  name: "Broadcast",
  data() {
    return {
      localStream: null,
      peerConnections: {}, // viewerId -> RTCPeerConnection
      cameraStarted: false,
      broadcasting: false,
      alreadyBroadcasting: false,
      connectionStatus: "未接続",
      viewerCount: 0,
      listeners: [],
    };
  },

  async created() {
    sw.enableScroll();

    // 既に配信中の場合は無効化する
    const roomRef = ref(database, `room`);
    const roomSnapshot = await get(roomRef);
    if (roomSnapshot.exists()) {
      this.alreadyBroadcasting = true;
      alert("既に配信中のルームが存在します。新しい配信は開始できません。");
    }
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
  unmounted() {
    sw.disableScroll();
  },

  methods: {
    async startBroadcast() {
      if (this.alreadyBroadcasting) {
        alert("既に別端末で配信中です。この端末では開始できません。");
        return;
      }

      try {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 1280,
              height: 720,
              facingMode: {exact: "environment"}
            },
            audio: true
          });
        } catch (err) {
          // exact指定が失敗したらフォールバック
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 1280,
              height: 720,
            },
            audio: true
          });
        }

        this.$refs.localVideo.srcObject = this.localStream;
        this.cameraStarted = true;
        console.log("カメラ開始成功");
      } catch (error) {
        console.error("カメラアクセスエラー:", error);
        alert("カメラにアクセスできませんでした: " + error.message);
      }

      if (!this.localStream) {
        alert("まずカメラを開始してください");
        return;
      }

      try {
        // ルーム初期化
        const roomRef = ref(database, `room`);
        await set(roomRef, {
          broadcaster: true,
          status: "live",
          started: Date.now(),
        });
        await set(ref(database, `room/signaling`), null);
        await set(ref(database, `room/requests`), null);

        // 視聴者監視開始
        this.listenForViewers();

        // 視聴者の join 要求を監視し、viewer ごとに PeerConnection を作成
        this.listenForJoinRequests();

        this.broadcasting = true;
        this.connectionStatus = "視聴者待ち";

        console.log("配信開始完了");
      } catch (error) {
        console.error("配信開始エラー:", error);
        alert("配信開始に失敗しました: " + error.message);
      }
    },

    listenForJoinRequests() {
      const reqRef = ref(database, `room/requests`);

      const unsubscribe = onValue(reqRef, async (snapshot) => {
        const requests = snapshot.val() || {};
        Object.keys(requests).forEach((viewerId) => {
          if (requests[viewerId]?.type === "join-request") {
            if (!this.peerConnections[viewerId]) {
              this.createPeerForViewer(viewerId);
            }
          }
        });
      });

      this.listeners.push(unsubscribe);
    },

    async createPeerForViewer(viewerId) {
      const pc = new RTCPeerConnection(rtcConfiguration);
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          this.connectionStatus = "配信中";
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const candidatesRef = ref(database, `room/signaling/${viewerId}/offerCandidates`);
          await push(candidatesRef, {
            candidate: event.candidate.toJSON(),
            timestamp: Date.now(),
          });
        }
      };

      this.peerConnections[viewerId] = pc;

      try {
        // viewer ごとのシグナリング領域を初期化
        await set(ref(database, `room/signaling/${viewerId}`), null);

        // Offer を作成して保存
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await set(ref(database, `room/signaling/${viewerId}/offer`), {
          type: offer.type,
          sdp: offer.sdp,
          timestamp: Date.now(),
        });

        // Answer と Answer 候補を監視
        this.listenForViewerAnswer(viewerId);
        this.listenForViewerAnswerCandidates(viewerId);
      } catch (e) {
        console.error("Offer作成エラー:", e);
      }
    },

    listenForViewerAnswer(viewerId) {
      const answerRef = ref(database, `room/signaling/${viewerId}/answer`);

      const unsubscribe = onValue(answerRef, async (snapshot) => {
        const answerData = snapshot.val();
        if (answerData && answerData.type) {
          try {
            await this.peerConnections[viewerId]?.setRemoteDescription(
                new RTCSessionDescription(answerData)
            );
            console.log(`Answer設定完了 viewerId=${viewerId}`);
          } catch (error) {
            console.error("Answer設定エラー:", error);
          }
        }
      });

      this.listeners.push(unsubscribe);
    },

    listenForViewerAnswerCandidates(viewerId) {
      const candidatesRef = ref(database, `room/signaling/${viewerId}/answerCandidates`);

      const unsubscribe = onValue(candidatesRef, (snapshot) => {
        const candidates = snapshot.val();
        if (!candidates) return;

        Object.values(candidates).forEach(async (c) => {
          if (c && c.candidate) {
            try {
              await this.peerConnections[viewerId]?.addIceCandidate(
                  new RTCIceCandidate(c.candidate)
              );
            } catch (error) {
              console.error("ICE候補追加エラー:", error);
            }
          }
        });
      });

      this.listeners.push(unsubscribe);
    },

    listenForViewers() {
      const viewersRef = ref(database, `room/viewers`);

      const unsubscribe = onValue(viewersRef, (snapshot) => {
        const viewers = snapshot.val() || {};
        this.viewerCount = Object.keys(viewers).length;

        // 離脱した viewer の PeerConnection をクリーンアップ
        Object.keys(this.peerConnections).forEach((viewerId) => {
          if (!viewers[viewerId]) {
            try {
              this.peerConnections[viewerId].onicecandidate = null;
              this.peerConnections[viewerId].onconnectionstatechange = null;
              this.peerConnections[viewerId].oniceconnectionstatechange = null;
              this.peerConnections[viewerId].close();
            } catch (error) {
              console.debug("pc.close() を無視:", error);
            }
            delete this.peerConnections[viewerId];
            // 可能ならシグナリングも掃除
            remove(ref(database, `room/signaling/${viewerId}`)).catch(() => {
            });
          }
        });
      });

      this.listeners.push(unsubscribe);
    },

    async stopBroadcast() {
      try {
        await this.cleanup(true);

        // UI状態リセット
        this.broadcasting = false;
        this.connectionStatus = "未接続";
        this.viewerCount = 0;
        this.alreadyBroadcasting = false;

        console.log("配信停止完了");
      } catch (error) {
        console.error("配信停止エラー:", error);
      }
    },

    async cleanup(force = false) {
      if (this.alreadyBroadcasting && !force) {
        return;
      }
      // リスナー解除
      this.listeners.forEach((unsub) => {
        try {
          if (typeof unsub === "function") unsub();
        } catch (error) {
          console.error("リスナー解除エラー:", error);
        }
      });
      this.listeners = [];

      // すべての PeerConnection を終了
      Object.values(this.peerConnections).forEach((pc) => {
        try {
          pc.onicecandidate = null;
          pc.onconnectionstatechange = null;
          pc.oniceconnectionstatechange = null;
          pc.close();
        } catch (e) {
          console.debug("pc.close() を無視:", e);
        }
      });
      this.peerConnections = {};

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
#app {
  margin: 112px 0;
}

h1 {
  text-align: center;
}

p {
  text-align: center;
}

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
  margin: 5px 0 16px;
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
