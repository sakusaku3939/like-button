<template>
  <div id="app">
    <div class="background" :style="{ backgroundImage: 'url(' + imageURL + ')' }"></div>
    <div id="lottie"></div>
    <div v-for="(comment, index) in this.commentList" :key="index">
      <span
          class="comment-text"
          :style="{
            top: `calc(var(--vh) * ${comment.posY})`,
            width: `${comment.message.length * 72}px`,
          }"
          v-text="comment.message"/>
    </div>
  </div>
</template>

<script>
import lottie from "lottie-web";
import {getDatabase, ref, onValue} from "firebase/database";
import {getDownloadURL, getStorage, ref as storageRef} from "firebase/storage";

let animation;
const db = getDatabase();
const storage = getStorage();

export default {
  mounted() {
    animation = lottie.loadAnimation({
      container: document.querySelector('#lottie'),
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: 'https://assets7.lottiefiles.com/packages/lf20_5bd1qxgc.json'
    });

    let currentId;
    onValue(ref(db, "current"), (snapshot) => {
      const current = snapshot.val();
      if (currentId !== undefined && currentId === current.id) {
        animation.playSegments([4, 60], true);
      }
      getDownloadURL(storageRef(storage, "files/" + current.id)).then((url) => this.imageURL = url);
      currentId = current.id;
    });

    let commentCount;
    onValue(ref(db, "comments"), (snapshot) => {
      if (commentCount !== undefined && commentCount < snapshot.size) {
        let i = 0;
        snapshot.forEach((e) => {
          if (i === snapshot.size - 1) {
            const topMin = 0;
            const topMax = 20;
            const bottomMin = 70;
            const bottomMax = 90;

            const isTop = Math.floor(Math.random() * 2) === 0;
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
  data() {
    return {
      imageURL: "",
      commentList: [],
    };
  },
}
</script>

<style scoped>
.background {
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
  background-color: rgba(0, 0, 0, .3);
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

.comment-text {
  position: absolute;
  display: inline-block;
  padding-left: 100vw;
  color: white;
  font-size: 72px;
  font-weight: bold;
  animation: scroll 6s linear 1;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000,
  -1px 1px 0 #000, 1px -1px 0 #000,
  0 1px 0 #000, 0 -1px 0 #000,
  -1px 0 0 #000, 1px 0 0 #000;
}

@keyframes scroll {
  0% {
    transform: translateX(0)
  }
  100% {
    transform: translateX(-100%)
  }
}

@media screen and (max-width: 900px) {
  #lottie {
    width: 100%;
  }

  .comment-text {
    font-size: 32px;
  }
}
</style>