<template>
  <div id="app">
    <router-link to="/">Home </router-link>
    <router-link to="/screen"> Screen</router-link>
    <router-view />
  </div>
</template>

<script>

</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;900&display=swap');
#app {
  font-family: 'Noto Sans JP', sans-serif;
}
</style>
