<template>
  <div id="#app">
    <form class="form" @submit="login" action="" onsubmit="return false">
      <h2>管理者画面にログインする</h2>
      <input type="email" placeholder="メールアドレス" v-model="email" required>
      <input type="password" placeholder="パスワード" v-model="password" required>
      <button class="ok" type="submit">ログイン</button>
      <div v-show="errorMessage.length" class="error-message">{{ errorMessage }}</div>
    </form>
  </div>
</template>

<script>
import {getAuth, onAuthStateChanged, signInWithEmailAndPassword} from "firebase/auth";

const auth = getAuth();

export default {
  created() {
    onAuthStateChanged(auth, (user) => {
      if (user) this.$router.push('/admin');
    });
  },
  data() {
    return {
      email: "",
      password: "",
      errorMessage: "",
    };
  },
  methods: {
    login() {
      signInWithEmailAndPassword(auth, this.email, this.password).catch(() => {
        this.errorMessage = "メールアドレスまたはパスワードが正しくありません";
      });
    },
  },
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(var(--vh) * 100);
  padding: 32px;
}

.form input {
  width: calc(100% - 20px);
  max-width: 400px;
  padding: 12px;
  border-radius: 2px;
  border: 1px solid #ccc;
  appearance: none;
  margin-bottom: 12px;
}

.form button {
  width: calc(100%);
  max-width: 420px;
  padding: 8px 32px;
  margin-top: 16px;
  margin-right: 0;
}

.error-message {
  color: #cf0000;
  list-style: none;
  font-size: 16px;
  margin-top: 16px;
  padding: 0;
}
</style>