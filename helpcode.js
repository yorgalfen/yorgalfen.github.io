console.log(`jQuery version: ${$.fn.jquery.split(" ")[0]}`);
$(document).ready(() => {
    $("#scheme").on("change", () => {
        $(".slo").hide();
        $(".lif").hide();
        $(".hei").hide();
        $(".ele").hide();
        $(".azi").hide();
        const sch = $("#scheme").val();
        $(`.${sch}`).show();
    });
});
