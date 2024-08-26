console.log(`jQuery version: ${$.fn.jquery.split(" ")[0]}`);
$(document).ready(() => {
    $("#scheme").on("change", () => {
        $(".z").hide();
        const sch = $("#scheme").val();
        $(`.${sch}`).show();
    });
});
