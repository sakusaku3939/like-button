<template>
  <div id="app">
    <div id="lottie" @click="animation"></div>
  </div>
</template>

<script>
import lottie from 'lottie-web';

let animation;

export default {
  name: 'App',
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

<style>
#app {
  overflow: hidden;
}

#lottie {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%);
  width: 60%;
}
</style>
