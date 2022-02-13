<template>
  <div id="app">
    <h1>発表者を切り替える</h1>

    <ul class="list-group">
      <li v-for="(element) in presenterList" :key="element.id" @click="changeAt(element.id)">
        <i class="fas fa-play play" v-if="element.id === current.id"></i>
        <div class="play-dummy" v-else></div>
        <div class="image"></div>
        <span class="title">{{ element.title }} </span>
        <div class="heart-counter">
          <i class="fas fa-heart"></i>
          <span v-if="element.id === current.id">{{ current.heartCounter }}</span>
          <span v-else>{{ findById(heartCounterList, element.id).heartCounter }}</span>
        </div>
      </li>
    </ul>

    <h2>現在の発表者: {{ findById(presenterList, current.id).title }}</h2>

    <modal name="change-presenter-modal" height="auto" :scrollable="true" :adaptive="true">
      <form class="modal" @submit="changePresenter" onsubmit="return false">
        <p>発表者を {{ findById(presenterList, changeId).title }} に切り替えますか？</p>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideChangeModal">キャンセル</button>
          <input class="ok" type="submit" value="切り替える">
        </div>
      </form>
    </modal>
  </div>
</template>

<script>
import presenter from "../../common/presenter-list.js"

export default {
  created() {
    presenter.updatePresenterList().then((list) => this.presenterList = list);
  },
  data() {
    return {
      presenterList: [],
      heartCounterList: [
        {id: 0, heartCounter: 0},
        {id: 1, heartCounter: 0},
        {id: 2, heartCounter: 0},
      ],
      current: {id: 0, heartCounter: 30},
      changeId: 0,
    };
  },
  methods: {
    findById(list, argId) {
      const index = list.findIndex(({id}) => id === argId);
      return index !== -1 ? list[index] : [];
    },
    changePresenter() {
      this.findById(this.heartCounterList, this.current.id).heartCounter = this.current.heartCounter;

      this.current.id = this.findById(this.presenterList, this.changeId).id;
      this.current.heartCounter = this.findById(this.heartCounterList, this.changeId).heartCounter;

      this.hideChangeModal();
    },
    changeAt(id) {
      this.changeId = id;
      this.$modal.show('change-presenter-modal');
    },
    hideChangeModal() {
      this.$modal.hide('change-presenter-modal');
    },
  }
}
</script>

<style scoped>
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