<template>
  <div id="app">
    <div id="lottie"></div>
  </div>
</template>

<script>
import lottie from "lottie-web";
import {getDatabase, ref, onValue} from "firebase/database";

let animation;
let isInitialLoad = true;
const db = getDatabase();

onValue(ref(db, 'like_count/count'), (snapshot) => {
  const count = snapshot.val();
  if (count !== 0 && !isInitialLoad) {
    animation.playSegments([4, 60], true);
  }
  isInitialLoad = false;
});

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
  }
}
</script>

<style scoped>
#app {
  position: relative;
  overflow: hidden;
  height: 95vh;
}

#lottie {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%);
  width: 60%;
}
</style>