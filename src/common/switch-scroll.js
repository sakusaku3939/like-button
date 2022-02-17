export default {
    enableScroll() {
        document.getElementsByTagName('body')[0].style.overflow = "visible";
        document.getElementsByTagName('body')[0].style.touchAction = "initial";
    },
    disableScroll() {
        document.getElementsByTagName('body')[0].style.overflow = "hidden";
        document.getElementsByTagName('body')[0].style.touchAction = "none";
    },
}