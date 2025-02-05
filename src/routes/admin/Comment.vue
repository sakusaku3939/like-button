<template>
  <div id="app">
    <h1>コメント確認</h1>

    <table>
      <thead>
      <tr>
        <th class="small">ID</th>
        <th class="medium">ユーザーID</th>
        <th>コメント内容</th>
        <th class="medium">時間</th>
        <th class="small"></th>
        <th class="small"></th>
      </tr>
      </thead>
      <tr v-for="(element, index) in commentList" :key="element.id">
        <td>{{ commentList.length - index }}</td>
        <td>{{ element.userId }}</td>
        <td>{{ element.message }}</td>
        <td>{{ formatDate(element.timestamp) }}</td>
        <td>
          <button v-if="blockUserIds.includes(element.userId)" class="unblock" @click="unblockUser(element.userId)">
            解除
          </button>
          <button v-else class="block" @click="blockAt(element.userId)">ブロック</button>
        </td>
        <td>
          <button class="delete" @click="deleteAt(element.id)">削除</button>
        </td>
      </tr>
    </table>

    <div v-if="deleteCommentModal" class="modal-overlay">
      <form class="modal" @submit="deleteComment" onsubmit="return false">
        <p v-if="findIndex(deleteId) !== -1">「{{
            commentList[findIndex(deleteId)].message
          }}」を削除しますか？この操作は元に戻せません。</p>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideDeleteModal">キャンセル</button>
          <input class="ok" type="submit" value="削除">
        </div>
      </form>
    </div>

    <div v-if="blockUserModal" class="modal-overlay">
      <form class="modal" @submit="blockUser" onsubmit="return false">
        <p>ユーザー「{{ blockUserId }}」をブロックして、今後のコメントを全て非表示にしますか</p>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideBlockModal">キャンセル</button>
          <input class="ok" type="submit" value="ブロック">
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import sw from "../../common/switch-scroll.js"
import {getDatabase, onValue, ref, remove, set} from "firebase/database";
import {useLoading} from "vue-loading-overlay";

const db = getDatabase();
const loading = useLoading()

export default {
  created() {
    const loader = loading.show();
    sw.enableScroll();
    onValue(ref(db, "comments"), (snapshot) => {
      this.commentList = [];
      snapshot.forEach((e) => {
        const val = e.val();
        this.commentList.push({
          id: e.key,
          userId: val.userId,
          message: val.message,
          timestamp: val.timestamp,
        });
      });
      this.commentList = this.commentList.slice().reverse();
      loader.hide();
    });
    onValue(ref(db, "block-users"), (snapshot) => {
      this.blockUserIds = [];
      snapshot.forEach((e) => {
        if (e.val().state === true) {
          this.blockUserIds.push(e.key);
        }
      });
    });
  },
  unmounted() {
    sw.disableScroll();
  },
  data() {
    return {
      commentList: [],
      blockUserIds: [],
      deleteId: 0,
      deleteCommentModal: false,
      blockUserId: "",
      blockUserModal: false,
    };
  },
  methods: {
    formatDate(timestamp) {
      const datetime = new Date(timestamp);
      const hours = ('00' + datetime.getHours()).slice(-2);
      const minutes = ('00' + datetime.getMinutes()).slice(-2);
      const seconds = ('00' + datetime.getSeconds()).slice(-2);
      return hours + ":" + minutes + ":" + seconds;
    },
    findIndex(argId) {
      return this.commentList.findIndex(({id}) => id === argId);
    },
    deleteAt(id) {
      this.deleteId = id;
      this.deleteCommentModal = true;
    },
    async deleteComment() {
      let index = this.findIndex(this.deleteId);
      if (index !== -1) {
        await remove(ref(db, "comments/" + this.deleteId));
      }
      this.hideDeleteModal();
    },
    hideDeleteModal() {
      this.deleteCommentModal = false;
    },
    blockAt(userId) {
      this.blockUserId = userId;
      this.blockUserModal = true;
    },
    hideBlockModal() {
      this.blockUserModal = false;
    },
    async blockUser() {
      await set(ref(db, "block-users/" + this.blockUserId), {
        state: true,
      });
      this.hideBlockModal();
    },
    async unblockUser(userId) {
      await remove(ref(db, "block-users/" + userId));
    },
  },
}
</script>

<style scoped>
#app {
  margin: 112px 0;
}

h1 {
  text-align: center;
}

table {
  border-collapse: collapse;
  border-spacing: 0;
  margin: 80px auto 0;
  width: 80%;
}

table tr {
  border-bottom: solid 1px #eee;
}

table th, table td {
  text-align: center;
  padding: 15px 0;
}

table th.small {
  width: 80px;
}

table th.medium {
  width: 112px;
}

.delete {
  color: white;
  background-color: #EF5350;
  border-radius: 8px;
  padding: 0;
  width: 90%;
  height: 32px;
  border: none;
  cursor: pointer;
  outline: none;
  appearance: none;
}

.block {
  color: white;
  background-color: #FFA726;
  border-radius: 8px;
  padding: 0;
  width: 90%;
  height: 32px;
  border: none;
  cursor: pointer;
  outline: none;
  appearance: none;
}

.unblock {
  color: white;
  background-color: #4CAF50;
  border-radius: 8px;
  padding: 0;
  width: 90%;
  height: 32px;
  border: none;
  cursor: pointer;
  outline: none;
  appearance: none;
}

.ok {
  background-color: #EF5350;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay > * {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

@media screen and (max-width: 1000px) {
  table {
    width: 95%;
  }
}
</style>