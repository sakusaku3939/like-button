<template>
  <div id="app">
    <div class="like-button">
      <div class="button" @click="animation"></div>
      <div id="lottie"></div>
    </div>
    <div class="title">
      <h1>発表に「いいね」を送る</h1>
      <span>※一回の発表につき100回まで可能です</span>
    </div>
  </div>
</template>

<script>
import lottie from "lottie-web";

let animation;

export default {
  name: "Screen",
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
    animation() {
      animation.playSegments([4, 60], true);
    }
  }
}
</script>

<style scoped>
#app {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%);
  overflow: hidden;
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

@media screen and (max-width: 480px) {
  .title h1 {
    font-size: 28px;
  }
}
</style>