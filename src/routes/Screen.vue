<template>
  <div id="app">
    <div class="background" :style="{ backgroundImage: 'url(' + imageURL + ')' }"></div>
    <div id="lottie"></div>
    <div v-for="(comment, index) in this.commentList" :key="index">
      <span
          class="comment-text border-text"
          :style="{
            top: `calc(var(--vh) * ${comment.posY})`,
            width: `${comment.message.length * 72}px`,
          }"
          v-text="comment.message"/>
    </div>
    <div class="comment-history">
      <div class="comment-text border-text" v-for="(comment, index) in this.commentHistory" :key="index"
           v-text="comment.message">
      </div>
    </div>
    <div class="title border-text">{{ currentTitle }}</div>
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
      path: 'https://lottie.host/129ab9bd-9710-452a-8baa-80250a322e82/cUU5i81gxy.json'
    });

    let currentId;
    onValue(ref(db, "current"), (snapshot) => {
      const current = snapshot.val();
      if (currentId !== undefined && currentId === current.id) {
        animation.playSegments([4, 60], true);
      }
      getDownloadURL(storageRef(storage, "files/" + current.id))
          .then((url) => this.imageURL = url)
          .catch(() => {
            getDownloadURL(storageRef(storage, "files/default.png"))
                .then((url) => this.imageURL = url)
                .catch(() => {
                      this.imageURL = ""
                    }
                );
          });
      currentId = current.id;
      this.currentTitle = current.title;
    });

    let commentCount;
    let isPreviousTop = false;
    onValue(ref(db, "comments"), (snapshot) => {
      this.commentHistory = Object.values(snapshot.val());
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
  data() {
    return {
      imageURL: "",
      currentTitle: "",
      commentList: [],
      commentHistory: [],
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
  animation: scroll 8s linear 1;
}

.border-text {
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000,
  -1px 1px 0 #000, 1px -1px 0 #000,
  0 1px 0 #000, 0 -1px 0 #000,
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

  .title {
    font-size: 40px;
  }
}
</style>