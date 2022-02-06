<template>
  <div class="app">
    <h1>発表者の追加・編集</h1>

    <draggable tag="ul" :list="list" class="list-group" handle=".handle" v-bind="dragOptions">
      <li v-for="(element, idx) in list" :key="element.text">
        <i class="fas fa-bars handle"></i>
        <div class="image"></div>
        <span class="text">{{ element.text }} </span>
        <i class="fas fa-times remove" @click="removeAt(idx)"></i>
      </li>
      <i class="far fa-plus-square add" @click="showAddModal"></i>
    </draggable>

    <modal name="add-presenter-modal" height="auto" :scrollable="true" :adaptive="true">
      <form class="modal" @submit="savePresenter" onsubmit="return false">
        <h2>発表者を追加</h2>
        <input class="title" type="text" placeholder="発表タイトル" v-model="inputTitle" required>
        <input type="file" ref="preview" @change="uploadFile" accept="image/jpeg, image/png">
        <div class="preview" v-if="url">
          <div class="delete-button" @click="deletePreview"><i class="fas fa-times"></i></div>
          <img :src="url" alt="">
        </div>
        <ul v-if="fileErrorMessages.length > 0" class="error-messages">
          <li v-for="(message, index) in fileErrorMessages" :key="index">
            {{ message }}
          </li>
        </ul>
        <div class="save-button-group">
          <input class="save" type="submit" value="保存">
          <button class="cancel" type="button" @click="hideAddModal">キャンセル</button>
        </div>
      </form>
    </modal>
  </div>
</template>

<script>
import Vue from "vue";
import draggable from "vuedraggable";
import VModal from 'vue-js-modal'

Vue.use(VModal, {componentName: 'modal'})
let id = 3;

export default {
  name: "Manage",
  order: 5,
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
    }
  },
  data() {
    return {
      list: [
        {text: "presenter1", id: 0},
        {text: "presenter2", id: 1},
        {text: "presenter3", id: 2}
      ],
      dragging: false,
      inputTitle: "",
      url: "",
      fileErrorMessages: [],
    };
  },
  methods: {
    removeAt(idx) {
      this.list.splice(idx, 1);
    },
    uploadFile() {
      const file = this.$refs.preview.files[0];
      if (this.checkFile(file)) {
        this.url = URL.createObjectURL(file);
      } else {
        this.deletePreview();
      }
    },
    deletePreview() {
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
      this.deletePreview();
    },
    savePresenter() {
      id++;
      this.list.push({text: this.inputTitle, id});
      this.hideAddModal();
    },
  }
};
</script>

<style scoped>
h1 {
  text-align: center;
  margin-top: 40px;
}

.list-group {
  margin: 0 10%;
}

.list-group li {
  display: flex;
  align-items: center;
  list-style: none;
  padding: 24px;
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
}

i.remove {
  color: #616161;
  font-size: 20px;
  margin-left: auto;
}

.image {
  display: inline-block;
  width: 160px;
  height: 90px;
  border: 1px solid rgba(0, 0, 0, 0.3);
  margin: 0 24px;
}

.text {
  font-size: 16px;
}

i.add {
  color: #424242;
  width: 100%;
  font-size: 32px;
  text-align: center;
  margin-top: 24px;
}

i.add:hover {
  opacity: 0.8;
}

.modal {
  display: flex;
  flex-direction: column;
  margin: 32px;
}

.modal h2 {
  margin-top: 8px;
  margin-bottom: 24px;
}

.title {
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

.save-button-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 24px;
  margin-left: auto;
}

.save {
  background-color: #333333;
  color: #ffffff;
  padding: 4px 32px;
  border: none;
  outline: none;
  appearance: none;
}

.save:hover {
  opacity: 0.9;
}

.cancel {
  margin-left: 12px;
  font-size: 14px;
  background-color: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  padding: 0;
  appearance: none;
}

.cancel:hover {
  opacity: 0.8;
}
</style>