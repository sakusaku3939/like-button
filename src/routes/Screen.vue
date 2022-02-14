<template>
  <div id="app">
    <div id="lottie"></div>
  </div>
</template>

<script>
import lottie from "lottie-web";
import {getDatabase, ref, onValue} from "firebase/database";

let animation;
const db = getDatabase();

export default {
  mounted() {
    let currentId;
    animation = lottie.loadAnimation({
      container: document.querySelector('#lottie'),
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: 'https://assets8.lottiefiles.com/packages/lf20_9wcp0umd.json'
    });
    onValue(ref(db, "current"), (snapshot) => {
      const current = snapshot.val();
      if (currentId !== undefined && currentId === current.id) {
        animation.playSegments([4, 60], true);
      }
      currentId = current.id;
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