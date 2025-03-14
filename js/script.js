document.querySelectorAll(".accordion-i").forEach(item => {
    item.addEventListener("click", (event) => {
        if (event.target.closest(".accordion-above") || event.target.closest(".accordion-t")) {
            item.classList.toggle("active");
        }
    });
});
