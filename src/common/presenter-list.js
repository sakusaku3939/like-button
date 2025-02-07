import {collection, deleteDoc, doc, getDocs, getFirestore, setDoc} from "firebase/firestore";
import {getStorage, ref, listAll, getDownloadURL} from "firebase/storage";

const db = getFirestore();
const storage = getStorage();

export default {
    async updatePresenterList() {
        let presenterList = [];
        let orderObject = {};
        const orderSnapshot = await getDocs(collection(db, "order"));
        orderSnapshot.forEach((doc) => {
            orderObject[doc.data().id] = parseInt(doc.id);
        });

        const urlObject = {};
        const filesSnapshot = await listAll(ref(storage, "files"));
        for (const imgRef of filesSnapshot.items) {
            urlObject[imgRef.name] = await getDownloadURL(imgRef);
        }

        const snapshot = await getDocs(collection(db, "presenter"));
        snapshot.forEach((doc) => {
            presenterList.push({
                id: parseInt(doc.id),
                imageURL: urlObject[doc.id] || "",
                title: doc.data().title,
                order: orderObject[doc.id]
            });
        });

        presenterList.sort((a, b) => a.order - b.order);
        return presenterList;
    },
    async reflectOrder(presenterList, newIndex) {
        const results = [];
        const deleteList = presenterList.splice(newIndex, 1);
        presenterList.splice(newIndex, 0, deleteList[0]);
        presenterList.map(function (list, index) {
            list.order = index;
        });

        const orderCollection = collection(db, "order");
        const orderDocs = await getDocs(orderCollection);
        const deletePromises = orderDocs.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        presenterList.forEach((list) => {
            results.push(
                setDoc(doc(db, "order", list.order.toString()), {
                    id: list.id,
                }, {merge: true})
            );
        });
        await Promise.all(results);
    },
}