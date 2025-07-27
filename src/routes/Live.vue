<template>
  <div id="app">
    <div ref="backgroundVideo" class="background"></div>

    <div v-if="!connected" class="connection-overlay">
      <div class="connection-status-card">
        <div class="loading-spinner"></div>
        <h2>{{ statusMessage }}</h2>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <button @click="retryConnection" class="retry-btn">
          再接続
        </button>
      </div>
    </div>

    <div id="lottie"></div>

    <div v-for="(comment, index) in this.commentList" :key="index">
      <span
          class="comment-text border-text"
          :style="{
          top: `calc(var(--vh) * ${comment.posY})`,
          width: `${comment.message.length * 72}px`,
        }"
          v-text="comment.message"
      />
    </div>

    <div class="comment-history">
      <div
          class="comment-text border-text"
          v-for="(comment, index) in this.commentHistory"
          :key="index"
          v-text="comment.message"
      ></div>
    </div>

    <div class="title border-text">{{ currentTitle }}</div>

    <div v-if="connected" class="connection-indicator">
      <span class="status-dot" :class="connectionStatus"></span>
      <span class="status-text">{{ statusText }}</span>
    </div>
  </div>
</template>

<script>
import lottie from "lottie-web";
import {rtcConfiguration} from "@/config/webrtc-config.js";
import {
  ref,
  set,
  push,
  onValue,
  get,
  remove,
  getDatabase,
} from "firebase/database";

const database = getDatabase();

let animation;

export default {
  data() {
    return {
      // WebRTC関連
      connected: false,
      connecting: false,
      peerConnection: null,
      remoteStream: null,
      connectionStatus: "disconnected",
      errorMessage: "",
      broadcastEnded: false,
      listeners: [],
      viewerRef: null,

      // 受信済み候補の重複防止
      processedOfferCandidateIds: new Set(),

      // 再接続用
      reconnectTimer: null,
      backoffMs: 1000,
      maxBackoffMs: 15000,
      lastJoinRequestAt: 0,

      // 既存のコメント・アニメーション関連
      imageURL: "",
      currentTitle: "",
      commentList: [],
      commentHistory: [],
    };
  },

  computed: {
    statusText() {
      const statusMap = {
        connecting: "LIVE",
        connected: "LIVE",
        disconnected: "切断",
        failed: "接続失敗",
      };
      return statusMap[this.connectionStatus] || "不明";
    },

    statusMessage() {
      if (this.errorMessage) return "エラーが発生しました";
      if (this.broadcastEnded) return "配信が終了しました";
      if (this.connecting) return "配信に接続中...";
      return "配信を探しています...";
    },
  },

  async mounted() {
    await this.initializeLottie();
    this.setupCommentListeners();

    // 自動的に配信に接続
    await this.joinBroadcast();

    // ページ離脱時の処理
    window.addEventListener("beforeunload", this.cleanup);
    // モバイル/Safari対策
    window.addEventListener("pagehide", this.cleanup, {once: true});
  },

  beforeUnmount() {
    this.cleanup();
    window.removeEventListener("beforeunload", this.cleanup);
    window.removeEventListener("pagehide", this.cleanup);
  },

  methods: {
    async initializeLottie() {
      animation = lottie.loadAnimation({
        container: document.querySelector("#lottie"),
        renderer: "svg",
        loop: false,
        autoplay: false,
        path: "https://lottie.host/129ab9bd-9710-452a-8baa-80250a322e82/cUU5i81gxy.json",
      });
    },

    setupCommentListeners() {
      let currentId;
      onValue(ref(database, "current"), (snapshot) => {
        const current = snapshot.val();
        if (currentId !== undefined && currentId === current.id) {
          animation.playSegments([4, 60], true);
        }

        currentId = current.id;
        this.currentTitle = current.title;
      });

      let commentCount;
      let isPreviousTop = false;
      onValue(ref(database, "comments"), (snapshot) => {
        this.commentHistory = Object.values(snapshot.val());
        this.commentHistory = this.commentHistory.slice().reverse();

        if (commentCount !== undefined && commentCount < snapshot.size) {
          let i = 0;
          snapshot.forEach((e) => {
            if (i === snapshot.size - 1) {
              const topMin = 0;
              const topMax = 24;
              const bottomMin = 68;
              const bottomMax = 80;

              let isTop = Math.round(Math.random()) === 0;
              if (isTop === isPreviousTop) {
                isTop = Math.round(Math.random()) === 0;
              }
              isPreviousTop = isTop;

              const min = isTop ? topMin : bottomMin;
              const max = isTop ? topMax : bottomMax;
              const posY = Math.floor(Math.random() * (max + 1 - min)) + min;

              this.commentList.push({message: e.val().message, posY: posY});
            }
            i++;
          });
        }
        commentCount = snapshot.size;
      });
    },

    async joinBroadcast() {
      this.connecting = true;
      this.errorMessage = "";
      this.connectionStatus = "connecting";
      this.processedOfferCandidateIds.clear();

      try {
        // 配信ルーム存在確認
        const roomRef = ref(database, `room`);
        const roomSnapshot = await get(roomRef);

        if (!roomSnapshot.exists()) {
          console.error("配信ルームが存在しません");
        }

        const roomData = roomSnapshot.val();
        if (!roomData || !roomData.broadcaster) {
          console.error("配信者情報が見つかりません");
        }

        // 旧シグナリングの掃除（視聴者が書くパスをクリア）
        await this.clearViewerSignaling();

        // WebRTC PeerConnection作成
        this.peerConnection = new RTCPeerConnection(rtcConfiguration);

        // リモートストリーム受信設定
        this.peerConnection.ontrack = (event) => {
          console.log("リモートストリーム受信:", event.streams[0]);
          this.remoteStream = event.streams[0];
          this.displayRemoteStream();
        };

        // 接続状態監視
        this.peerConnection.onconnectionstatechange = () => {
          this.connectionStatus = this.peerConnection.connectionState;
          console.log("接続状態:", this.connectionStatus);

          if (this.connectionStatus === "connected") {
            this.connected = true;
            this.connecting = false;
            this.backoffMs = 1000; // 成功したらバックオフをリセット
            if (this.reconnectTimer) {
              clearTimeout(this.reconnectTimer);
              this.reconnectTimer = null;
            }
            this.listenForBroadcastStop(database);
            console.log("配信に接続しました");

          } else if (this.connectionStatus === "failed") {
            this.errorMessage = "接続に失敗しました";
            this.connecting = false;
            this.scheduleReconnect();

          } else if (this.connectionStatus === "disconnected") {
            // 一時切断の可能性があるため再接続を試みる
            this.scheduleReconnect();
          }
        };

        // ICE状態監視（より詳細）
        this.peerConnection.oniceconnectionstatechange = () => {
          const ice = this.peerConnection.iceConnectionState;
          console.log("ICE状態:", ice);
          if (ice === "failed" || ice === "disconnected") {
            this.scheduleReconnect();
          }
        };

        // ICE候補収集（視聴者 → 配信者）
        this.peerConnection.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              const candidatesRef = ref(database, `room/answerCandidates`);
              await push(candidatesRef, {
                candidate: event.candidate.toJSON(),
                timestamp: Date.now(),
              });
            } catch (error) {
              console.error("ICE候補送信エラー:", error);
            }
          }
        };

        // 視聴者として登録
        const viewerId = this.generateViewerId();
        this.viewerRef = ref(database, `room/viewers/${viewerId}`);
        await set(this.viewerRef, {
          joinedAt: Date.now(),
          userAgent: navigator.userAgent,
        });

        // Offer監視開始
        await this.listenForOffer(database);

        // Offer候補監視開始（配信者 → 視聴者）
        this.listenForOfferCandidates(database);

        // 配信者に接続要求を送信
        this.lastJoinRequestAt = Date.now();
        await this.sendJoinRequest(database);

        console.log("配信接続開始");
      } catch (error) {
        console.error("配信接続エラー:", error);
        this.errorMessage = error.message || "配信への接続に失敗しました";
        this.connecting = false;
        this.scheduleReconnect();
      }
    },

    async clearViewerSignaling() {
      try {
        // 自分（視聴者）が書き込む候補は毎回クリア
        await set(ref(database, `room/answerCandidates`), null);
      } catch (e) {
        console.warn("シグナリング初期化失敗（視聴者）:", e);
      }
    },

    async sendJoinRequest(database) {
      try {
        // 配信者に接続要求を送信
        const answerRef = ref(database, `room/answer`);
        await set(answerRef, {
          type: "join-request",
          timestamp: Date.now(),
        });
        console.log("参加要求を送信");
      } catch (error) {
        console.error("参加要求送信エラー:", error);
      }
    },

    async listenForOffer(database) {
      const offerRef = ref(database, `room/offer`);

      const unsubscribe = onValue(offerRef, async (snapshot) => {
        const offerData = snapshot.val();

        if (offerData && offerData.type === "offer") {
          console.log("Offer受信:", offerData);

          try {
            // Remote description設定
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(offerData)
            );

            // Answer作成
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // AnswerをRealtime Databaseに保存（上書き）
            const answerRef = ref(database, `room/answer`);
            await set(answerRef, {
              type: answer.type,
              sdp: answer.sdp,
              timestamp: Date.now(),
            });

            console.log("Answer送信完了");
          } catch (error) {
            console.error("Offer処理エラー:", error);
            this.errorMessage = "WebRTC接続エラー";
          }
        }
      });

      this.listeners.push(unsubscribe);
    },

    listenForOfferCandidates(database) {
      const candidatesRef = ref(database, `room/offerCandidates`);

      const unsubscribe = onValue(candidatesRef, (snapshot) => {
        const candidates = snapshot.val();
        if (candidates) {
          Object.entries(candidates).forEach(async ([key, candidateData]) => {
            if (candidateData && candidateData.candidate) {
              if (this.processedOfferCandidateIds.has(key)) return;
              this.processedOfferCandidateIds.add(key);
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

    listenForBroadcastStop(database) {
      const stopRef = ref(database, `room`);

      const unsubscribe = onValue(stopRef, async (snapshot) => {
        if (!snapshot.exists()) {
          console.log("配信停止");
          this.broadcastEnded = true;
          this.connectionStatus = "disconnected";
          this.connected = false;
          this.connecting = false;
          await this.cleanup();
        }
      });

      this.listeners.push(unsubscribe);
    },

    displayRemoteStream() {
      // 背景として映像を表示
      const backgroundDiv = this.$refs.backgroundVideo;

      // 既存のvideo要素があれば削除
      const existingVideo = backgroundDiv.querySelector("video");
      if (existingVideo) {
        existingVideo.remove();
      }

      // 新しいvideo要素作成
      const video = document.createElement("video");
      video.srcObject = this.remoteStream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";

      backgroundDiv.appendChild(video);

      console.log("リモート映像表示完了");
    },

    generateViewerId() {
      return "viewer_" + Math.random().toString(36).substring(2, 15);
    },

    scheduleReconnect() {
      if (this.reconnectTimer || this.connected || this.connecting) return;
      const delay = Math.min(this.backoffMs, this.maxBackoffMs);
      console.log(`再接続を ${delay}ms 後に試行します`);
      this.reconnectTimer = setTimeout(async () => {
        this.reconnectTimer = null;
        this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
        await this.retryConnection();
      }, delay);
    },

    async retryConnection() {
      this.errorMessage = "";
      this.broadcastEnded = false;
      await this.cleanup();
      await this.joinBroadcast();
    },

    async cleanup() {
      // タイマー解除
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

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
          this.peerConnection.ontrack = null;
          this.peerConnection.onicecandidate = null;
          this.peerConnection.onconnectionstatechange = null;
          this.peerConnection.oniceconnectionstatechange = null;
          this.peerConnection.close();
        } catch (e) {
          console.debug("peerConnection.close() を無視:", e);
        }
        this.peerConnection = null;
      }

      // 視聴者の登録解除
      if (this.viewerRef) {
        try {
          await remove(this.viewerRef);
        } catch (error) {
          console.error("視聴者登録解除エラー:", error);
        }
        this.viewerRef = null;
      }

      // UI状態リセット
      this.connected = false;
      this.connecting = false;
      this.connectionStatus = "disconnected";
      this.remoteStream = null;

      // 背景映像削除
      const backgroundDiv = this.$refs.backgroundVideo;
      if (backgroundDiv) {
        backgroundDiv.innerHTML = "";
      }
    },
  },
};
</script>

<style scoped>
.background {
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 100%;
  height: calc(var(--vh) * 100);
  background-color: #000;
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
}

.background:after {
  content: "";
  display: block;
  background-color: rgba(0, 0, 0, 0.3);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(var(--vh) * 100);
}

.connection-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.connection-status-card {
  background: white;
  padding: 30px;
  border-radius: 10px;
  text-align: center;
  color: #333;
  max-width: 350px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.connection-status-card h2 {
  margin: 15px 0 10px 0;
  font-size: 1.5rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error {
  color: #dc3545;
  margin: 12px 0 0;
  font-size: 14px;
  background: #f8d7da;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #f5c6cb;
}

.retry-btn {
  background: #007bff;
  border: none;
  color: white;
  padding: 8px 24px;
  margin-top: 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background: #0056b3;
}

.connection-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 15px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ccc;
}

.status-dot.connecting {
  background-color: #ffc107;
  animation: pulse-dot 2s infinite;
}

.status-dot.connected {
  background-color: #28a745;
}

.status-dot.failed {
  background-color: #dc3545;
}

@keyframes pulse-dot {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

#lottie {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(calc(-50% + 8px)) translateX(-50%);
  width: 60%;
  z-index: 10;
}

.comment-text {
  position: absolute;
  display: inline-block;
  padding-left: 100vw;
  color: white;
  font-size: 72px;
  font-weight: bold;
  animation: scroll 8s linear 1;
  z-index: 20;
}

.border-text {
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000,
  -1px 1px 0 #000, 1px -1px 0 #000, 0 1px 0 #000, 0 -1px 0 #000,
  -1px 0 0 #000, 1px 0 0 #000;
}

.comment-history {
  display: flex;
  flex-direction: column-reverse;
  position: absolute;
  top: 0;
  left: 8px;
  width: 100%;
  height: calc(var(--vh) * 100);
  overflow: hidden;
  z-index: 20;
}

.comment-history .comment-text {
  position: relative;
  display: block;
  padding-left: 0;
  font-size: 16px;
  animation: none;
}

.title {
  position: absolute;
  right: 0;
  bottom: 0;
  font-size: 56px;
  color: white;
  margin: 8px;
  z-index: 20;
}

@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

@media screen and (max-width: 900px) {
  #lottie {
    width: 100%;
  }

  .comment-text {
    font-size: 32px;
  }

  .title {
    font-size: 40px;
  }

  .connection-status-card {
    margin: 20px;
    padding: 30px 20px;
  }

  .connection-indicator {
    top: 10px;
    right: 10px;
    padding: 8px 16px;
    font-size: 14px;
  }
}
</style>
