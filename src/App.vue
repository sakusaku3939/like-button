<template>
  <div id="app">
    <router-view/>
    <div class="link" v-show="hostname === 'localhost'">
      <router-link to="/">ホーム</router-link>
      <span>│</span>
      <router-link to="/screen">発表画面</router-link>
      <span>│</span>
      <span v-if="streaming">
        <router-link to="/live">ライブ発表画面</router-link>
        <span>│</span>
        <router-link to="/broadcast">ライブ配信</router-link>
        <span>│</span>
      </span>
      <router-link to="/admin">管理画面</router-link>
    </div>
  </div>
</template>

<script>
import config from "./config/firebase-config.js"
import sw from "./common/switch-scroll.js"
import {initializeApp} from 'firebase/app';
import {useRemoteConfig} from "@/common/use-remote-config";

initializeApp(config);

const appHeight = () => {
  document.documentElement.style.setProperty('--vh', window.innerHeight / 100 + 'px');
};
window.addEventListener('resize', appHeight);
appHeight();

sw.disableScroll();

const {fetchConfig, getStreaming} = useRemoteConfig()

export default {
  async created() {
    this.hostname = document.location.hostname;
    await fetchConfig()
    this.streaming = await getStreaming()
  },
  data() {
    return {
      hostname: '',
      streaming: false,
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