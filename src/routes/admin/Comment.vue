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
      <tr v-for="(element) in reverseList()" :key="element.id">
        <td>{{ element.id }}</td>
        <td>{{ element.comment }}</td>
        <td>{{ element.timeCode }}</td>
        <td>
          <button class="delete" @click="deleteAt(element.id)">削除</button>
        </td>
      </tr>
    </table>

    <modal name="delete-presenter-modal" height="auto" :scrollable="true" :adaptive="true">
      <form class="modal" @submit="deleteComment" onsubmit="return false">
        <p v-if="this.findIndex(deleteId) !== -1">{{ this.findIndex(deleteId).comment }} を削除しますか？この操作は元に戻せません。</p>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideDeleteModal">キャンセル</button>
          <input class="ok" type="submit" value="削除">
        </div>
      </form>
    </modal>
  </div>
</template>

<script>
export default {
  data() {
    return {
      list: [
        {id: 0, comment: "コメント1", timeCode: "16:15:04"},
        {id: 1, comment: "コメント2", timeCode: "16:16:32"},
        {id: 2, comment: "コメント3", timeCode: "16:18:12"}
      ],
      deleteId: 0,
    };
  },
  methods: {
    reverseList() {
      return this.list.slice().reverse();
    },
    deleteAt(id) {
      this.deleteId = id;
      alert(this.deleteId)
      this.$modal.show('delete-presenter-modal');
    },
    deleteComment() {
      let index = this.findIndex(this.deleteId);
      if (index !== -1) {
        this.list.splice(index, 1);
      }
      this.hideDeleteModal();
    },
    hideDeleteModal() {
      this.$modal.hide('delete-presenter-modal');
    },
    findIndex(argId) {
      return this.list.findIndex(({id}) => id === argId);
    },
  },
}
</script>

<style scoped>
#app {
  margin: 64px 0;
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