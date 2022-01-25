<template>
  <div id="app">
    <div id="lottie" ref="lottie"></div>
  </div>
</template>

<script>
import lottie from 'lottie-web';

export default {
  name: 'App',
  mounted() {
    lottie.loadAnimation({
      container: document.querySelector('#lottie'),
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: 'https://assets8.lottiefiles.com/packages/lf20_9wcp0umd.json'
    });
  },
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
  width: 50%;
}
</style>
