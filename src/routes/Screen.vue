<template>
  <div id="app">
    <div class="background" :style="{ backgroundImage: 'url(' + imageURL + ')' }"></div>
    <div id="lottie"></div>
  </div>
</template>

<script>
import lottie from "lottie-web";
import {getDatabase, ref as refD, onValue} from "firebase/database";
import {getDownloadURL, getStorage, ref} from "firebase/storage";

let animation;
const db = getDatabase();
const storage = getStorage();

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
    onValue(refD(db, "current"), (snapshot) => {
      const current = snapshot.val();
      if (currentId !== undefined && currentId === current.id) {
        animation.playSegments([4, 60], true);
      }
      getDownloadURL(ref(storage, "files/" + current.id)).then((url) => this.imageURL = url);
      currentId = current.id;
    });
  },
  data() {
    return {
      imageURL: "",
    };
  },
}
</script>

<style scoped>
.background {
  content: "";
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 100%;
  height: calc(var(--vh) * 100);
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
}

.background:after {
  content: "";
  display: block;
  background-color: rgba(0, 0, 0, 0.4);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(var(--vh) * 100);
}

#lottie {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(calc(-50% + 8px)) translateX(-50%);
  width: 60%;
}

@media screen and (max-width: 900px) {
  #lottie {
    width: 100%;
  }
}
</style>