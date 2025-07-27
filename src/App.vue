<template>
  <div id="app">
    <router-view/>
    <div class="link" v-show="hostname === 'localhost'">
      <router-link to="/">ホーム</router-link>
      <span>│</span>
      <router-link to="/screen">発表画面</router-link>
      <span>│</span>
      <router-link to="/live">発表画面（Live）</router-link>
      <span>│</span>
      <router-link to="/admin">管理者画面</router-link>
    </div>
  </div>
</template>

<script>
import config from "./config/firebase-config.js"
import sw from "./common/switch-scroll.js"
import {initializeApp} from 'firebase/app';

initializeApp(config);

const appHeight = () => {
  document.documentElement.style.setProperty('--vh', window.innerHeight / 100 + 'px');
};
window.addEventListener('resize', appHeight);
appHeight();

sw.disableScroll();

export default {
  async created() {
    this.hostname = document.location.hostname;
  },
  data() {
    return {
      hostname: '',
    };
  },
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;900&display=swap');
@import "./common/modal.css";

:root {
  --vh: 100vh;
}

body {
  margin: 0;
  padding: 0;
}

#app {
  font-family: 'Noto Sans JP', sans-serif;
  height: calc(var(--vh) * 100);
}

.link {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
}
</style>