<template>
  <div id="app">
    <h1>発表者を切り替える</h1>

    <ul class="list-group">
      <li v-for="(element) in presenterList" :key="element.id" @click="changeAt(element.id)">
        <i class="fas fa-play play" v-if="element.id === current.id"></i>
        <div class="play-dummy" v-else></div>
        <img class="image" v-if="element.imageURL" :src="element.imageURL" alt="">
        <div class="image dummy" v-else/>
        <span class="title">{{ element.title }} </span>
        <div class="heart-counter">
          <i class="fas fa-heart"></i>
          <span v-if="element.id === current.id">{{ current.likeCount }}</span>
          <span v-else>{{ findById(likeCountList, element.id).likeCount || 0 }}</span>
        </div>
      </li>
    </ul>

    <h2>現在の発表者: {{ findById(presenterList, current.id).title || "なし" }}</h2>

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
import sw from "../../common/switch-scroll.js"
import presenter from "../../common/presenter-list.js"
import {getDatabase, ref, set, get, child, onValue} from "firebase/database";

const db = getDatabase();

export default {
  created() {
    sw.enableScroll();
    onValue(ref(db, "current"), (snapshot) => {
      if (snapshot.exists()) {
        this.current = {id: snapshot.val().id, likeCount: snapshot.val().count}
      }
    });
    presenter.updatePresenterList().then((list) => {
      this.presenterList = list;
      get(child(ref(db), "like-count")).then((snapshot) => {
        if (snapshot.exists()) {
          snapshot.forEach((e) => {
            this.likeCountList.push({id: parseInt(e.key), likeCount: e.val().count});
          });
        } else {
          list.forEach((e) => {
            this.likeCountList.push({id: e.id, likeCount: 0});
            set(ref(db, "like-count/" + e.id), {
              count: 0,
            });
          });
        }
      });
    });
  },
  destroyed() {
    sw.disableScroll();
  },
  data() {
    return {
      presenterList: [],
      likeCountList: [],
      current: {id: undefined, likeCount: undefined},
      changeId: 0,
    };
  },
  methods: {
    findById(list, argId) {
      const index = list.findIndex(({id}) => id === argId);
      return index !== -1 ? list[index] : [];
    },
    async changePresenter() {
      const countList = this.findById(this.likeCountList, this.current.id);
      if (countList.id !== undefined) {
        countList.likeCount = this.current.likeCount;
        await set(ref(db, "like-count/" + this.current.id), {
          count: this.current.likeCount,
        });
      }

      this.current.id = this.findById(this.presenterList, this.changeId).id;
      this.current.likeCount = this.findById(this.likeCountList, this.changeId).likeCount;
      await set(ref(db, "current"), {
        id: this.current.id,
        count: this.current.likeCount,
      });

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
  margin: 112px 0;
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
  margin: 0 24px;
}

.dummy {
  border: 1px solid rgba(0, 0, 0, 0.3);
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