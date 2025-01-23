<template>
  <div id="app">
    <h1>発表者の追加・編集</h1>

    <draggable tag="ul" :list="presenterList" class="list-group" handle=".handle" v-bind="dragOptions"
               @update="onUpdate">
      <li v-for="(element) in presenterList" :key="element.id">
        <i class="fas fa-bars handle"></i>
        <img class="image" v-if="element.imageURL" :src="element.imageURL" alt="">
        <div class="image dummy" v-else/>
        <span class="title">{{ element.title }}</span>
        <i class="fas fa-times remove" @click="deleteAt(element.id)"></i>
      </li>
      <i class="far fa-plus-square add" @click="showAddModal"></i>
    </draggable>

    <!-- Add Presenter Modal -->
    <VueFinalModal
        v-model="isAddModalVisible"
        content-class="modal"
        hide-overlay
        focus-trap
    >
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
    </VueFinalModal>

    <!-- Delete Presenter Modal -->
    <VueFinalModal
        v-model="isDeleteModalVisible"
        content-class="modal"
        hide-overlay
        focus-trap
    >
      <form class="modal" @submit="deletePresenter" onsubmit="return false">
        <p v-if="findIndex(deleteId) !== -1">{{ presenterList[findIndex(deleteId)].title }} を削除しますか？この操作は元に戻せません。</p>
        <div class="form-button-group">
          <button class="cancel" type="button" @click="hideDeleteModal">キャンセル</button>
          <input class="ok" type="submit" value="削除">
        </div>
      </form>
    </VueFinalModal>
    <div class="ghost"></div> <!-- Ignore unused warning -->
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { VueFinalModal } from 'vue-final-modal';
import draggable from 'vuedraggable';
import presenter from "../../common/presenter-list.js";
import { getFirestore, doc, setDoc, getDocs, deleteDoc, collection } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, deleteObject } from "firebase/storage";
import { remove, ref as dbRef, getDatabase, set } from "firebase/database";

const db = getFirestore();
const database = getDatabase();
const storage = getStorage();

export default {
  components: {
    VueFinalModal,
    draggable,
  },
  computed: {
    dragOptions() {
      return {
        animation: 200,
        group: "description",
        disabled: false,
        ghostClass: "ghost",
      };
    },
  },
  created() {
    presenter.updatePresenterList().then((list) => (this.presenterList = list));
  },
  data() {
    return {
      presenterList: [],
      deleteId: 0,
      inputTitle: "",
      url: "",
      fileErrorMessages: [],
      isAddModalVisible: false,
      isDeleteModalVisible: false,
    };
  },
  methods: {
    async onUpdate(e) {
      await presenter.reflectOrder(this.presenterList, e.newIndex);
    },
    findIndex(argId) {
      return this.presenterList.findIndex(({ id }) => id === argId);
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
      this.url = "";
      URL.revokeObjectURL(this.url);
      this.$refs.preview.value = "";
    },
    checkFile(file) {
      let result = true;
      this.fileErrorMessages = [];
      const SIZE_LIMIT = 5000000;
      if (file.type !== "image/jpeg" && file.type !== "image/png") {
        this.fileErrorMessages.push(
            "アップロード可能なファイルは .jpeg または .png のみです。"
        );
        result = false;
      }
      if (file.size > SIZE_LIMIT) {
        this.fileErrorMessages.push("アップロードできるファイルサイズは5MBまでです。");
        result = false;
      }
      return result;
    },
    async addPresenter() {
      // 同様の処理
    },
    async deletePresenter() {
      // 同様の処理
    },
    showAddModal() {
      this.isAddModalVisible = true;
    },
    hideAddModal() {
      this.isAddModalVisible = false;
      this.inputTitle = "";
      this.removePreview();
    },
    deleteAt(id) {
      this.deleteId = id;
      this.isDeleteModalVisible = true;
    },
    hideDeleteModal() {
      this.isDeleteModalVisible = false;
    },
  },
};
</script>
