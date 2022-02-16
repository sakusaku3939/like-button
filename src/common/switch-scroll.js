export default {
    enableScroll() {
        document.getElementsByTagName('body')[0].style.overflow = "visible";
    },
    disableScroll() {
        document.getElementsByTagName('body')[0].style.overflow = "hidden";
    },
}