<template>
  <div id="app">
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
        <textarea
            v-model="text"
            class="comment-textarea"
            placeholder="匿名でコメントを送る"
            @compositionstart="composing=true"
            @compositionend="composing=false"
            @keydown="handleKeydown"
            :style="{height:`${getTextareaHeight}px`}"/>
        <i class="fas fa-paper-plane" @click="sendComment"></i>
      </div>
    </div>
  </div>
</template>

<script>
import lottie from "lottie-web";
import {getDatabase, ref, update, increment} from "firebase/database";

let animation;
const db = getDatabase();
const maxLength = 100;
const maxRowCount = 3;

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
  computed: {
    getTextareaHeight() {
      let rowCount = (`${this.text}\n`).match(/\n/g).length;
      if (rowCount > maxRowCount) rowCount = maxRowCount;
      const lineHeight = 16 * 1.5;
      const paddingVertical = 0;
      const borderVertical = 2;
      return lineHeight * rowCount + paddingVertical + borderVertical;
    },
  },
  watch: {
    text(val) {
      if (val.length >= maxLength) val = val.slice(0, maxLength);
      let rows = val.split(/\n/);
      this.text = rows.slice(0, 3).join('\n');
    }
  },
  methods: {
    handleKeydown(e) {
      if (this.composing) return;
      const rowCount = (`${this.text}\n`).match(/\n/g).length;
      if (rowCount >= maxRowCount && e.key === 'Enter') {
        document.activeElement.blur();
      }
    },
    clickLikeButton() {
      animation.playSegments([4, 60], true);
      update(ref(db, "current"), {count: increment(1)});
    },
    sendComment() {
      console.log(this.text);
    },
  }
}
</script>

<style scoped>
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
  margin: 8px auto;
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
  height: calc(var(--vh) * 95);
}

.comment {
  width: 100%;
  text-align: center;
}

.comment-textarea {
  font-family: inherit;
  resize: none;
  border: none;
  outline: none;
  padding-left: 12px;
  font-size: 16px;
  line-height: 1.5;
  width: 60%;
  border-bottom: 1px solid rgba(0, 0, 0, .42);
}

.comment i {
  padding: 4px;
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