import {collection, doc, getDocs, getFirestore, setDoc} from "firebase/firestore";

const db = getFirestore();

export default {
    async updatePresenterList() {
        let presenterList = [];
        let orderList = {};
        const orderSnapshot = await getDocs(collection(db, "order"));
        orderSnapshot.forEach((doc) => {
            orderList[doc.data().id] = parseInt(doc.id);
        });

        const snapshot = await getDocs(collection(db, "presenter"));
        snapshot.forEach((doc) => {
            presenterList.push({id: parseInt(doc.id), title: doc.data().title, order: orderList[doc.id]});
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