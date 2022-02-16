<template>
  <div id="app">
    <div class="screen-link">
      <router-link to="/screen">発表画面に移動 →</router-link>
    </div>
    <div class="center">
      <div class="like-button">
        <div class="button" @click="clickLikeButton"></div>
        <div id="lottie"></div>
      </div>
      <div class="title">
        <h1>発表に「いいね」を送る</h1>
        <span>※一回の発表につき何回でも可能です</span>
      </div>
    </div>
    <div class="bottom">
      <div class="comment">
        <input v-model="text" class="comment-input" type="text" placeholder="匿名でコメントを送る" maxlength="50"/>
        <i class="fas fa-paper-plane" @click="sendComment"></i>
      </div>
    </div>
  </div>
</template>

<script>
import lottie from "lottie-web";
import {getDatabase, ref, push, update, increment, serverTimestamp} from "firebase/database";
import swal from 'sweetalert';
import ngWord from "../config/ng-word.js"

let animation;
const db = getDatabase();

document.documentElement.style.setProperty('--fixed-center', window.innerHeight / 2 + 'px');

export default {
  data() {
    return {
      text: "",
      composing: false,
    }
  },
  mounted() {
    animation = lottie.loadAnimation({
      container: document.querySelector('#lottie'),
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: 'https://assets8.lottiefiles.com/packages/lf20_9wcp0umd.json'
    });
  },
  methods: {
    clickLikeButton() {
      animation.playSegments([4, 60], true);
      update(ref(db, "current"), {count: increment(1)});
    },
    sendComment() {
      if (this.text === "") return;

      const ng = decodeURIComponent(escape(window.atob(ngWord.text))).replace(/,/g, '|');
      if (RegExp(ng).test(this.text) || /^[A-Za-z]*$/.test(this.text)) {
        swal({
          text: "コメントの送信に失敗しました",
          icon: "error",
          button: false,
        });
      } else {
        push(ref(db, "comments"), {
          message: this.text,
          timestamp: serverTimestamp(),
        }).then(() =>
            swal({
              text: "コメントが送信されました",
              icon: "success",
              button: false,
            })
        );
      }
      this.text = "";
    },
  }
}
</script>

<style scoped>
:root {
  --fixed-center: 50vh;
}

.screen-link {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 14px;
}

.center {
  position: absolute;
  top: var(--fixed-center);
  left: 50%;
  transform: translateY(-50%) translateX(-50%);
}

.title {
  text-align: center;
  width: 80vw;
  margin-bottom: 48px;
}

.title h1 {
  margin: 8px 0;
}

.like-button {
  position: relative;
  width: 60vw;
  height: 60vw;
  max-width: 320px;
  max-height: 320px;
  margin: 0 auto;
}

.button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%);
  width: 90%;
  height: 90%;
  margin-top: -4px;
  border-radius: 50%;
  box-shadow: 0 8px 18px 0 rgba(45, 54, 65, 0.2);
}

#lottie {
  position: absolute;
  width: 100%;
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%);
  pointer-events: none;
}

.bottom {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  width: 100%;
  height: calc(var(--vh) * 100);
}

.comment {
  width: 100%;
  text-align: center;
  background-color: white;
  padding-top: 4px;
  padding-bottom: 16px;
  z-index: 2;
}

.comment-input {
  font-family: inherit;
  border: none;
  outline: none;
  padding-left: 12px;
  font-size: 16px;
  line-height: 2;
  width: 60%;
  background-color: rgba(0, 0, 0, 0);
  border-bottom: 1px solid rgba(0, 0, 0, .42);
}

.comment i {
  padding: 8px;
  font-size: 20px;
  color: rgba(0, 0, 0, .54);
  cursor: pointer;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}

.comment i:active {
  background-color: rgba(0, 0, 0, 0.1);
}

@media screen and (max-width: 480px) {
  .title h1 {
    font-size: 28px;
  }
}
</style>