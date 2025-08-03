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

    <div class="overlay-wrapper">
      <div v-if="connected" class="mute-button" @click="toggleMute">
        <span class="mute-icon">{{ muted ? '🔇' : '🔊' }}</span>
        <span class="mute-text">{{ muted ? 'ミュート解除' : 'ミュート' }}</span>
      </div>

      <div v-if="connected" class="connection-indicator">
        <span class="status-dot" :class="connectionStatus"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
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
      viewerId: null,
      muted: true,

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
        this.commentHistory = Object.values(snapshot.val() || {});
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

    toggleMute() {
      this.muted = !this.muted;
      const video = this.$refs.backgroundVideo.querySelector("video");
      if (video) {
        video.muted = this.muted;
      }
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
          await this.cleanup();
          return
        }

        // 視聴者として登録（先に viewerId を確定）
        const viewerId = this.generateViewerId();
        this.viewerId = viewerId;
        this.viewerRef = ref(database, `room/viewers/${viewerId}`);
        await this.safeWrite(this.viewerRef, {
          joinedAt: Date.now(),
          userAgent: navigator.userAgent,
        });

        // 自分用のシグナリング領域を初期化
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
              if (!this.viewerId) return;
              const candidatesRef = ref(database, `room/signaling/${this.viewerId}/answerCandidates`);
              await push(candidatesRef, {
                candidate: event.candidate.toJSON(),
                timestamp: Date.now(),
              });
            } catch (error) {
              console.error("ICE候補送信エラー:", error);
            }
          }
        };

        // Offer監視開始（viewerId 固有）
        await this.listenForOffer(database);

        // Offer候補監視開始（配信者 → 視聴者、viewerId 固有）
        this.listenForOfferCandidates(database);

        // 配信者に接続要求を送信（viewerId 固有）
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
        if (!this.viewerId) return;
        await this.safeWrite(ref(database, `room/signaling/${this.viewerId}/answerCandidates`), null);
        await this.safeWrite(ref(database, `room/signaling/${this.viewerId}/answer`), null);
      } catch (e) {
        console.warn("シグナリング初期化失敗（視聴者）:", e);
      }
    },

    async sendJoinRequest(database) {
      try {
        if (!this.viewerId) return;
        const reqRef = ref(database, `room/requests/${this.viewerId}`);
        await this.safeWrite(reqRef, {
          type: "join-request",
          viewerId: this.viewerId,
          timestamp: Date.now(),
        });
        console.log("参加要求を送信");
      } catch (error) {
        console.error("参加要求送信エラー:", error);
      }
    },

    async listenForOffer(database) {
      if (!this.viewerId) return;
      const offerRef = ref(database, `room/signaling/${this.viewerId}/offer`);

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

            // AnswerをRealtime Databaseに保存（viewerId 固有）
            const answerRef = ref(database, `room/signaling/${this.viewerId}/answer`);
            await this.safeWrite(answerRef, {
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
      if (!this.viewerId) return;
      const candidatesRef = ref(database, `room/signaling/${this.viewerId}/offerCandidates`);

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
      video.muted = this.muted;
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

    async safeWrite(writeRef, data) {
      const roomSnapshot = await get(ref(database, "room"));
      if (!roomSnapshot.exists()) {
        console.warn("ルームが存在しないため書き込みを中止");
        return;
      }
      return await set(writeRef, data);
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

      // join-request とシグナリングを削除
      if (this.viewerId) {
        try {
          await remove(ref(database, `room/requests/${this.viewerId}`));
          await remove(ref(database, `room/signaling/${this.viewerId}`));
        } catch (e) {
          console.debug("リクエスト/シグナリング削除を無視:", e);
        }
      }
      this.viewerId = null;

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

.overlay-wrapper {
  display: flex;
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  gap: 8px;
}

.mute-button {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 15px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.3s ease;
}

.mute-button:hover {
  background: rgba(0, 0, 0, 0.9);
}

.mute-icon {
  font-size: 16px;
}

.mute-text {
  font-size: 14px;
  font-weight: 500;
}

.connection-indicator {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 15px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
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

  .mute-button {
    top: 10px;
    left: 10px;
    padding: 8px 16px;
    font-size: 14px;
  }

  .mute-icon {
    font-size: 14px;
  }

  .mute-text {
    font-size: 12px;
  }
}
</style>