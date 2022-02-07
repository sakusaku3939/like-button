<template>
  <div id="app">
    <h1>発表者を切り替える</h1>

    <ul class="list-group">
      <li v-for="(element) in list" :key="element.id" @click="changeAt(element.id)">
        <i class="fas fa-play play" v-if="element.id === current.id"></i>
        <div class="play-dummy" v-else></div>
        <div class="image"></div>
        <span class="title">{{ element.title }} </span>
        <div class="heart-counter">
          <i class="fas fa-heart"></i>
          <span v-if="element.id === current.id">{{ current.heartCounter }}</span>
          <span v-else>{{ element.heartCounter }}</span>
        </div>
      </li>
    </ul>

    <h2>現在の発表者: {{ current.title }}</h2>

    <modal name="change-presenter-modal" height="auto" :scrollable="true" :adaptive="true">
      <form class="modal" @submit="changePresenter" onsubmit="return false">
        <p>発表者を {{ this.list[changeId].title }} に切り替えますか？</p>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideChangeModal">キャンセル</button>
          <input class="ok" type="submit" value="切り替える">
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
        {id: 0, title: "presenter1", heartCounter: 0},
        {id: 1, title: "presenter2", heartCounter: 0},
        {id: 2, title: "presenter3", heartCounter: 0}
      ],
      current: {id: 0, title: "presenter1", heartCounter: 30},
      changeId: 0,
    };
  },
  methods: {
    changeAt(id) {
      this.changeId = id;
      this.$modal.show('change-presenter-modal');
    },
    changePresenter() {
      this.list[this.current.id].heartCounter = this.current.heartCounter;

      let list = this.list[this.changeId];
      this.current.id = list.id;
      this.current.title = list.title;
      this.current.heartCounter = list.heartCounter;

      this.hideChangeModal();
    },
    hideChangeModal() {
      this.$modal.hide('change-presenter-modal');
    },
  }
}
</script>

<style scoped>
@import "../../common/modal.css";

#app {
  margin: 64px 0;
}

h1 {
  text-align: center;
}

h2 {
  text-align: center;
  margin-top: 80px;
}

.list-group {
  margin: 80px 10% 0;
  padding: 0;
}

.list-group li {
  display: flex;
  align-items: center;
  list-style: none;
  padding: 24px 16px;
}

.list-group li:hover {
  background-color: #F5F5F5;
}

.list-group li + li {
  border-top: 1px solid rgba(0, 0, 0, 0.2);
}

i.play {
  color: #212121;
  font-size: 20px;
}

.play-dummy {
  margin-left: 18px;
}

.heart-counter {
  display: flex;
  flex-direction: column;
  color: rgb(255, 76, 76);
  margin-left: auto;
}

.heart-counter i {
  font-size: 20px;
}

.heart-counter span {
  text-align: center;
  font-size: 14px;
}

.image {
  width: 160px;
  height: 90px;
  border: 1px solid rgba(0, 0, 0, 0.3);
  margin: 0 24px;
}

.title {
  font-size: 16px;
}


@media screen and (max-width: 1000px) {
  .list-group {
    margin: 80px 56px 0;
  }

  .image {
    width: 80px;
    height: 45px;
  }
}

@media screen and (max-width: 600px) {
  .list-group {
    margin: 80px 16px 0;
  }
}
</style>