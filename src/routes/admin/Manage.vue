<template>
  <div id="app">
    <h1>発表者の追加・編集</h1>

    <VueDraggable tag="ul" :list="presenterList" class="list-group" handle=".handle" v-bind="dragOptions"
                  @update="onUpdate">
      <li v-for="(element) in presenterList" :key="element.id">
        <i class="fas fa-bars handle"></i>
        <img class="image" v-if="element.imageURL" :src="element.imageURL" alt="">
        <div class="image dummy" v-else/>
        <i class="fas fa-pencil-alt handle" @click="showEditModal(element.id)"></i>
        <span class="title">{{ element.title }}</span>
        <i class="fas fa-times remove" @click="deleteAt(element.id)"></i>
      </li>
      <i class="far fa-plus-square add" @click="showAddModal"></i>
    </VueDraggable>

    <div v-if="showAddPresenterModal" class="modal-overlay">
      <form class="modal" @submit="addPresenter" onsubmit="return false">
        <h2>発表者を追加</h2>
        <input class="input-title" type="text" placeholder="発表タイトル" v-model="inputTitle" required>
        <div style="margin: 8px 0">サムネイル画像</div>
        <input type="file" ref="preview" @change="uploadFile" accept="image/jpeg, image/png">
        <div class="preview" v-show="url">
          <div class="delete-button" @click="removePreview"><i class="fas fa-times"></i></div>
          <img :src="url" alt="">
        </div>
        <ul v-show="fileErrorMessages.length > 0" class="error-messages">
          <li v-for="(message, index) in fileErrorMessages" :key="index">
            {{ message }}
          </li>
        </ul>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideAddModal">キャンセル</button>
          <input class="ok" type="submit" value="保存">
        </div>
      </form>
    </div>

    <div v-if="showEditPresenterModal" class="modal-overlay">
      <form class="modal" @submit="editPresenter" onsubmit="return false">
        <h2>発表者を編集</h2>
        <input class="input-title" type="text" placeholder="発表タイトル" v-model="inputTitle" required>
        <div style="margin: 8px 0">サムネイル画像</div>
        <input type="file" ref="preview" @change="uploadFile" accept="image/jpeg, image/png">
        <div class="preview" v-show="url">
          <div class="delete-button" @click="removePreview"><i class="fas fa-times"></i></div>
          <img :src="url" alt="">
        </div>
        <ul v-show="fileErrorMessages.length > 0" class="error-messages">
          <li v-for="(message, index) in fileErrorMessages" :key="index">
            {{ message }}
          </li>
        </ul>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideEditModal">キャンセル</button>
          <input class="ok" type="submit" value="保存">
        </div>
      </form>
    </div>

    <div v-if="showDeletePresenterModal" class="modal-overlay">
      <form class="modal" @submit="deletePresenter" onsubmit="return false">
        <p v-if="findIndex(deleteId) !== -1">「{{
            presenterList[findIndex(deleteId)]?.title ?? "不明な発表"
          }}」を削除しますか？この操作は元に戻せません。</p>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideDeleteModal">キャンセル</button>
          <input class="ok" type="submit" value="削除">
        </div>
      </form>
    </div>
    <div class="ghost"></div> <!-- Ignore unused warning -->
  </div>
</template>

<script>
import {VueDraggable} from 'vue-draggable-plus'
import sw from "../../common/switch-scroll.js"
import presenter from "../../common/presenter-list.js"
import {getFirestore, doc, setDoc, getDocs, deleteDoc, collection} from "firebase/firestore";
import {getStorage, ref as storageRef, uploadBytes, deleteObject} from "firebase/storage";
import {remove, ref, getDatabase, set} from "firebase/database";

const db = getFirestore();
const database = getDatabase();
const storage = getStorage();

export default {
  components: {
    VueDraggable
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
    sw.enableScroll();
    presenter.updatePresenterList().then((list) => {
      this.presenterList = list
    });
  },
  unmounted() {
    sw.disableScroll();
  },
  data() {
    return {
      presenterList: [],
      deleteId: 0,
      editId: 0,
      inputTitle: "",
      url: "",
      fileErrorMessages: [],
      showAddPresenterModal: false,
      showEditPresenterModal: false,
      showDeletePresenterModal: false,
    };
  },
  methods: {
    onUpdate: async function (e) {
      await presenter.reflectOrder(this.presenterList, e.newIndex);
    },
    findIndex(argId) {
      return this.presenterList.findIndex(({id}) => id === argId);
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
    getFileBlob(url, cb) {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'blob';
      xhr.onload = () => {
        cb(xhr.response);
      };
      xhr.open('GET', url);
      xhr.send();
    },
    async addPresenter() {
      let maxId = -1;
      const snapshot = await getDocs(collection(db, "presenter"));
      snapshot.forEach((doc) => maxId = Math.max(maxId, parseInt(doc.id)));
      maxId++;

      const lastOrder = this.presenterList.length;
      await setDoc(doc(db, "presenter", maxId.toString()), {
        title: this.inputTitle,
      }, {merge: true});
      await setDoc(doc(db, "order", lastOrder.toString()), {
        id: maxId,
      }, {merge: true});
      this.presenterList.push({id: maxId, imageURL: this.url, title: this.inputTitle, order: lastOrder});

      await set(ref(database, "like-count/" + maxId), {
        count: 0,
      });

      if (this.url !== "") {
        const ref = storageRef(storage, "files/" + maxId);
        await new Promise((resolve) => {
          this.getFileBlob(this.url, blob => {
            uploadBytes(ref, blob).then(() => resolve());
          });
        });
      }
      this.hideAddModal();
    },
    async editPresenter() {
      let index = this.findIndex(this.editId);
      if (index === null || index === -1) {
        console.error("編集対象の発表者が見つかりません");
        return;
      }
      if (this.inputTitle.length > 0) {
        await setDoc(doc(db, "presenter", this.editId.toString()), {
          title: this.inputTitle,
        }, {merge: true});
        this.presenterList[index].title = this.inputTitle;
      }

      if (this.url !== "") {
        const ref = storageRef(storage, "files/" + this.editId);
        await new Promise((resolve) => {
          this.getFileBlob(this.url, blob => {
            uploadBytes(ref, blob).then(() => resolve());
          });
        });
      }
      this.hideEditModal();
    },
    async deletePresenter() {
      let index = this.findIndex(this.deleteId);
      if (index === null) {
        console.error("削除対象の発表者が見つかりません");
        return;
      }
      this.hideDeleteModal();
      if (index !== -1) {
        const results = [];
        results.push(deleteDoc(doc(db, "order", index.toString())));
        results.push(deleteDoc(doc(db, "presenter", this.deleteId.toString())));
        results.push(deleteObject(storageRef(storage, "files/" + this.deleteId)).catch(() => false));
        results.push(remove(ref(database, "like-count/" + this.deleteId)));
        this.presenterList.splice(index, 1);
        await Promise.all(results);

        if (this.presenterList.length) {
          await presenter.reflectOrder(this.presenterList, 0);
          await deleteDoc(doc(db, "order", this.presenterList.length.toString()));
        }
      }
    },
    showAddModal() {
      this.showAddPresenterModal = true;
    },
    hideAddModal() {
      this.showAddPresenterModal = false;
      this.inputTitle = "";
      this.removePreview();
    },
    showEditModal(id) {
      this.editId = id;
      this.showEditPresenterModal = true;
      this.inputTitle = this.presenterList[this.findIndex(id)].title;
      this.url = this.presenterList[this.findIndex(id)].imageURL;
    },
    hideEditModal() {
      this.showEditPresenterModal = false;
      this.inputTitle = "";
      this.removePreview();
    },
    deleteAt(id) {
      this.deleteId = id;
      this.showDeletePresenterModal = true;
    },
    hideDeleteModal() {
      this.showDeletePresenterModal = false;
    },
  }
};
</script>

<style scoped>
#app {
  margin: 112px 0;
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
  margin: 0 24px;
}

.dummy {
  border: 1px solid rgba(0, 0, 0, 0.3);
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