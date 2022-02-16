<template>
  <div id="app">
    <h1>コメント確認</h1>

    <table>
      <tr>
        <th class="small">ID</th>
        <th>コメント内容</th>
        <th class="medium">時間</th>
        <th class="small"></th>
      </tr>
      <tr v-for="(element, index) in commentList" :key="element.id">
        <td>{{ commentList.length - index }}</td>
        <td>{{ element.message }}</td>
        <td>{{ formatDate(element.timestamp) }}</td>
        <td>
          <button class="delete" @click="deleteAt(element.id)">削除</button>
        </td>
      </tr>
    </table>

    <modal name="delete-presenter-modal" height="auto" :scrollable="true" :adaptive="true">
      <form class="modal" @submit="deleteComment" onsubmit="return false">
        <p v-if="findIndex(deleteId) !== -1">{{ commentList[findIndex(deleteId)].message }} を削除しますか？この操作は元に戻せません。</p>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideDeleteModal">キャンセル</button>
          <input class="ok" type="submit" value="削除">
        </div>
      </form>
    </modal>
  </div>
</template>

<script>
import sw from "../../common/switch-scroll.js"
import {getDatabase, onValue, ref, remove} from "firebase/database";

const db = getDatabase();

export default {
  created() {
    sw.enableScroll();
    onValue(ref(db, "comments"), (snapshot) => {
      this.commentList = [];
      snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val();
        this.commentList.push({id: childSnapshot.key, message: val.message, timestamp: val.timestamp});
      });
      this.commentList = this.commentList.slice().reverse();
    });
  },
  destroyed() {
    sw.disableScroll();
  },
  data() {
    return {
      commentList: [],
      deleteId: 0,
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
      this.$modal.show('delete-presenter-modal');
    },
    async deleteComment() {
      let index = this.findIndex(this.deleteId);
      if (index !== -1) {
        await remove(ref(db, "comments/" + this.deleteId));
      }
      this.hideDeleteModal();
    },
    hideDeleteModal() {
      this.$modal.hide('delete-presenter-modal');
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

.ok {
  background-color: #EF5350;
}

@media screen and (max-width: 1000px) {
  table {
    width: 95%;
  }
}
</style>