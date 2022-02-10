<template>
  <div id="app">
    <h1>発表者の追加・編集</h1>

    <draggable tag="ul" :list="this.presenterList" class="list-group" handle=".handle" v-bind="dragOptions"
               @update="onUpdate">
      <li v-for="(element) in this.presenterList" :key="element.id">
        <i class="fas fa-bars handle"></i>
        <div class="image"></div>
        <span class="title">{{ element.title }} </span>
        <i class="fas fa-times remove" @click="deleteAt(element.id)"></i>
      </li>
      <i class="far fa-plus-square add" @click="showAddModal"></i>
    </draggable>

    <modal name="add-presenter-modal" height="auto" :scrollable="true" :adaptive="true">
      <form class="modal" @submit="savePresenter" onsubmit="return false">
        <h2>発表者を追加</h2>
        <input class="input-title" type="text" placeholder="発表タイトル" v-model="inputTitle" required>
        <div style="margin: 8px 0">サムネイル画像</div>
        <input type="file" ref="preview" @change="uploadFile" accept="image/jpeg, image/png">
        <div class="preview" v-if="url">
          <div class="delete-button" @click="removePreview"><i class="fas fa-times"></i></div>
          <img :src="url" alt="">
        </div>
        <ul v-if="fileErrorMessages.length > 0" class="error-messages">
          <li v-for="(message, index) in fileErrorMessages" :key="index">
            {{ message }}
          </li>
        </ul>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideAddModal">キャンセル</button>
          <input class="ok" type="submit" value="保存">
        </div>
      </form>
    </modal>

    <modal name="delete-presenter-modal" height="auto" :scrollable="true" :adaptive="true">
      <form class="modal" @submit="deletePresenter" onsubmit="return false">
        <p v-if="this.findIndex(deleteId) !== -1">{{ this.presenterList[this.findIndex(deleteId)].title }}
          を削除しますか？この操作は元に戻せません。</p>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideDeleteModal">キャンセル</button>
          <input class="ok" type="submit" value="削除">
        </div>
      </form>
    </modal>
    <div class="ghost"></div> <!-- Ignore unused warning -->
  </div>
</template>

<script>
import Vue from "vue";
import draggable from "vuedraggable";
import VModal from 'vue-js-modal'
import {getFirestore, doc, setDoc, getDocs, collection} from "firebase/firestore";

Vue.use(VModal, {componentName: 'modal'})
const db = getFirestore();

export default {
  components: {
    draggable,
  },
  computed: {
    dragOptions() {
      return {
        animation: 200,
        group: "description",
        disabled: false,
        ghostClass: "ghost"
      };
    },
  },
  created() {
    this.updatePresenterList();
  },
  data() {
    return {
      presenterList: [],
      deleteId: 0,
      inputTitle: "",
      url: "",
      fileErrorMessages: [],
    };
  },
  methods: {
    onUpdate: function (e) {
      const deleteList = this.presenterList.splice(e.newIndex, 1);
      this.presenterList.splice(e.newIndex, 0, deleteList[0])
      this.presenterList.map(function (list, index) {
        list.order = index;
      });

      this.presenterList.forEach((list) => {
        setDoc(doc(db, "order", list.order.toString()), {
          id: list.id,
        }, {merge: true});
      });
    },
    async getAllPresenter() {
      return await getDocs(collection(db, "presenter"));
    },
    async setPresenter(id, title, imageURL) {
      return await setDoc(doc(db, "presenter", id.toString()), {
        title: title,
        imageURL: imageURL,
      }, {merge: true});
    },
    async updatePresenterList() {
      this.presenterList = [];
      let orderList = {};
      const orderSnapshot = await getDocs(collection(db, "order"));
      orderSnapshot.forEach((doc) => {
        orderList[doc.id] = doc.data().id;
      });

      const snapshot = await this.getAllPresenter();
      snapshot.forEach((doc) => {
        this.presenterList.push({id: doc.id, title: doc.data().title, order: orderList[doc.id]});
      });

      this.presenterList.sort((a, b) => a.order - b.order);
    },
    deleteAt(id) {
      this.deleteId = id;
      this.$modal.show('delete-presenter-modal');
    },
    uploadFile() {
      const file = this.$refs.preview.files[0];
      if (this.checkFile(file)) {
        this.url = URL.createObjectURL(file);
      } else {
        this.removePreview();
      }
    },
    removePreview() {
      this.url = '';
      URL.revokeObjectURL(this.url);
      this.$refs.preview.value = "";
    },
    checkFile(file) {
      let result = true;
      this.fileErrorMessages = [];
      const SIZE_LIMIT = 5000000;
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        this.fileErrorMessages.push('アップロード可能なファイルは .jpeg または .png のみです。');
        result = false;
      }
      if (file.size > SIZE_LIMIT) {
        this.fileErrorMessages.push('アップロードできるファイルサイズは5MBまでです。');
        result = false;
      }
      return result;
    },
    showAddModal() {
      this.$modal.show('add-presenter-modal');
    },
    hideAddModal() {
      this.$modal.hide('add-presenter-modal');
      this.inputTitle = "";
      this.removePreview();
    },
    async savePresenter() {
      let maxId = -1;
      const snapshot = await this.getAllPresenter();
      snapshot.forEach((doc) => maxId = Math.max(maxId, doc.id));
      maxId++;

      await this.setPresenter(maxId, this.inputTitle, "");
      this.presenterList.push({id: maxId, title: this.inputTitle, order: maxId});
      this.hideAddModal();
    },
    deletePresenter() {
      let index = this.findIndex(this.deleteId);
      if (index !== -1) {
        this.presenterList.splice(index, 1);
      }
      this.hideDeleteModal();
    },
    hideDeleteModal() {
      this.$modal.hide('delete-presenter-modal');
    },
    findIndex(argId) {
      return this.presenterList.findIndex(({id}) => id === argId);
    },
  }
};
</script>

<style scoped>
#app {
  margin: 64px 0;
}

h1 {
  text-align: center;
}

.list-group {
  margin: 80px 10% 0;
  padding: 0;
}

.list-group li {
  display: flex;
  align-items: center;
  list-style: none;
  padding: 24px 0;
}

.list-group li + li {
  border-top: 1px solid rgba(0, 0, 0, 0.2);
}

.ghost {
  opacity: 0;
}

i.handle {
  color: #616161;
  font-size: 20px;
  padding: 16px;
}

i.remove {
  color: #616161;
  font-size: 20px;
  margin-left: auto;
  padding: 8px;
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

i.add {
  color: #424242;
  width: 100%;
  font-size: 32px;
  text-align: center;
  margin-top: 16px;
}

i.add:hover {
  opacity: 0.8;
}

.input-title {
  width: calc(100% - 20px);
  max-width: 400px;
  padding: 8px;
  border-radius: 2px;
  border: 1px solid #ccc;
  appearance: none;
  margin-bottom: 16px;
}

.preview {
  position: relative;
}

.preview img {
  width: 100%;
  margin-top: 4px;
}

.delete-button {
  position: absolute;
  top: 4px;
  right: 8px;
}

.error-messages {
  color: #cf0000;
  list-style: none;
  font-size: 16px;
  margin-top: 4px;
  padding: 0;
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