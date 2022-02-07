<template>
  <div id="app">
    <h1>コメント確認</h1>

    <table>
      <tr>
        <th class="small">ID</th>
        <th>コメント内容</th>
        <th class="medium">時間</th>
        <th class="small">削除</th>
      </tr>
      <tr v-for="(element) in reverseList()" :key="element.id">
        <td>{{ element.id }}</td>
        <td>{{ element.comment}}</td>
        <td>{{element.timeCode}}</td>
        <td>削除</td>
      </tr>
    </table>
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
  cursor: pointer;
}

table tr:hover {
  background-color: #d4f0fd;
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

@media screen and (max-width: 1000px) {
  table {
    width: 95%;
  }
}
</style>