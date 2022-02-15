<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
import config from "./config/firebase-config.js"
import {initializeApp} from 'firebase/app';

initializeApp(config);

const appHeight = () => {
  document.documentElement.style.setProperty('--vh', window.innerHeight / 100 + 'px');
};
window.addEventListener('resize', appHeight);
appHeight();

export default {}
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
  overflow: hidden;
}

#app {
  font-family: 'Noto Sans JP', sans-serif;
  height: calc(var(--vh) * 100);
}
</style>
