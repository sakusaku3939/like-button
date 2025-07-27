<template>
  <div id="app">
    <div class="link" v-show="hostname !== 'localhost'">
      <router-link to="/">ホーム</router-link>
      <span>│</span>
      <router-link to="/screen">発表画面</router-link>
      <span>│</span>
      <router-link to="/live" v-if="streamingEnabled">発表画面（Live）</router-link>
      <span>│</span>
      <router-link to="/admin">管理者画面</router-link>
    </div>
    <div class="card-list">
      <router-link to="/admin/manage" class="card">
        <span class="fas fa-user-plus"></span>
        <p>発表者の追加・編集</p>
      </router-link>
      <router-link to="/admin/switch" class="card">
        <span class="fas fa-exchange-alt"></span>
        <p>発表者を切り替える</p>
      </router-link>
      <router-link to="/admin/comment" class="card">
        <span class="fas fa-comments"></span>
        <p>コメント確認</p>
      </router-link>
      <router-link to="/admin/broadcast" class="card" v-if="streamingEnabled">
        <span class="fas fa-video"></span>
        <p>ライブ配信</p>
      </router-link>
    </div>
  </div>
</template>

<script>
import {useRemoteConfig} from "@/common/use-remote-config";

const {fetchConfig, getStreaming} = useRemoteConfig()

export default {
  async created() {
    this.hostname = document.location.hostname;
    await fetchConfig()
    this.streamingEnabled = await getStreaming()
  },
  data() {
    return {
      hostname: '',
      streamingEnabled: false,
    };
  },
}
</script>

<style scoped>
#app {
  display: flex;
  align-items: center;
}

.card-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  margin: 0 20%;
  width: 100%;
}

.card {
  text-decoration: none;
  padding: 24px;
  margin: 12px;
  width: 30%;
  min-width: 170px;
  box-shadow: 0 8px 8px 0 rgba(0, 0, 0, 0.1), 0 17px 50px 0 rgba(0, 0, 0, 0.12);
  border-radius: 32px;
  border: 2px solid rgba(0, 0, 0, 0.5);
}

.card-list:after {
  content: "";
  display: block;
  padding: 24px;
  margin: 14px;
  width: 30%;
  min-width: 170px;
}

.card span {
  display: block;
  margin-top: 8px;
  font-size: 40px;
  text-align: center;
  color: #616161;
}

.card p {
  font-size: 16px;
  text-align: center;
  margin-top: 12px;
  color: #424242;
}

@media screen and (max-width: 900px) {
  .card-list {
    margin: 0;
  }
}

@media screen and (max-width: 490px) {
  .card-list:after {
    display: none;
  }
}
</style>