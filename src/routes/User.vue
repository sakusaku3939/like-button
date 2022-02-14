<template>
  <div id="app">
    <div class="center">
      <div class="like-button">
        <div class="button" @click="click_like_button"></div>
        <div id="lottie"></div>
      </div>
      <div class="title">
        <h1>発表に「いいね」を送る</h1>
        <span>※一回の発表につき100回まで可能です</span>
      </div>
    </div>
    <div class="comment">
      <input type="text" class="input-comment" placeholder="匿名でコメントを送る">
      <i class="fas fa-paper-plane"></i>
    </div>
  </div>
</template>

<script>
import lottie from "lottie-web";
import {getDatabase, ref, update, increment} from "firebase/database";

let animation;
const db = getDatabase();

export default {
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
    click_like_button() {
      animation.playSegments([4, 60], true);
      update(ref(db, "current"), {count: increment(1)});
    }
  }
}
</script>

<style scoped>
#app {
  overflow: hidden;
}

.center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%);
}

.title {
  text-align: center;
  width: 80vw;
  margin-bottom: 32px;
}

.title h1 {
  margin-bottom: 8px;
}

.like-button {
  position: relative;
  width: 60vw;
  height: 60vw;
  max-width: 320px;
  max-height: 320px;
  margin: 24px auto;
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

.comment {
  position: absolute;
  display: flex;
  width: 90%;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
}

.input-comment {
  border: none;
  outline: none;
  font-size: 16px;
  text-indent: 8px;
  width: 100%;
  padding: 4px 0;
  border-bottom: 1px solid rgba(0, 0, 0, .42);
}

.comment i {
  margin: auto 8px;
  font-size: 20px;
  color: rgba(0, 0, 0, .54);
  cursor: pointer;
}

@media screen and (max-width: 480px) {
  .title h1 {
    font-size: 28px;
  }
}
</style>