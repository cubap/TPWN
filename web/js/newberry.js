var tpen = {
    project: {},
    manifest: {},
    screen:{
        focusItem:[null, null],
        liveTool: "none",
        zoomMultiplier: 2,
        isMagnifying: false,
        isFullscreen: true,
        isAddingLines: false,
        colorList: [
            "rgba(153,255,0,.4)",
            "rgba(0,255,204,.4)",
            "rgba(51,0,204,.4)",
            "rgba(204,255,0,.4)",
            "rgba(0,0,0,.4)",
            "rgba(255,255,255,.4)",
            "rgba(255,0,0,.4)"],
        colorThisTime: "rgba(255,255,255,.4)",
        currentFolio: 0
    },
    user: {
        current: false,
        isAdmin: false
    }
};
var dragHelper = "<div id='dragHelper'></div>";
var adjustRatio = 0; // QUERY: not sure what this is -cubap

/**
 * Redraw the screen for use after updating the current line, folio, or
 * tools being used. Expects all screen variables to be set.
 *
 * @return {undefined}
*/
function redraw () {
    tpen.screen.focusItem = [null, null];
    if (tpen.screen.currentFolio > - 1) {
        if (tpen.screen.liveTool === "parsing") {
            $(".pageTurnCover").show();
            fullPage();
            tpen.screen.currentFolio = parseInt(tpen.screen.currentFolio);
            var canvas = tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio];
            if (!canvas) {
                canvas = tpen.manifest.sequences[0].canvases[0];
                console.warn("Folio was not found in Manifest. Loading first page...");
            }
            loadTranscriptionCanvas(canvas, true);
            setTimeout(function () {
            hideWorkspaceForParsing();
                $(".pageTurnCover").fadeOut(1500);
            }, 800);
        }
    } else {
    // failed to draw, no Canvas selected
    }
}

/* Load the interface to the first page of the manifest. */
function firstFolio () {
    tpen.screen.currentFolio = 0;
    redraw();
}

/* Load the interface to the last page of the manifest. */
function lastFolio(){
    tpen.screen.currentFolio = tpen.manifest.sequences[0].canvases.length - 1;
    redraw();
}
/* Load the interface to the previous page from the one you are on. */
function previousFolio (parsing) {
    if (tpen.screen.currentFolio === 0) {
        throw new Error("You are already on the first page.");
    }
    tpen.screen.currentFolio--;
    redraw();
}

/* Load the interface to the next page from the one you are on. */
function nextFolio (parsing) {
    if (tpen.screen.currentFolio >= tpen.manifest.sequences[0].canvases.length - 1) {
        throw new Error("That page is beyond the last page.");
    }
    tpen.screen.currentFolio++;
    redraw();
}

/** Test if a given string can be parsed into a valid JSON object.
 * @param str  A string
 * @return bool
*/
function isJSON(str) {
    if (typeof str === "object") {
        return true;
    }
    else {
        try {
            JSON.parse(str);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    return false;
};

function resetTranscription(){
    window.location.reload();
}

/* Populate the split page for Text Preview.  These are the transcription lines' text. */
function createPreviewPages(){
    $(".previewPage").remove();
        var pageLabel = "";
        var transcriptionFolios = tpen.manifest.sequences[0].canvases;
        for (var i = 0; i < transcriptionFolios.length; i++) {
            var currentFolioToUse = transcriptionFolios[i];
            pageLabel = currentFolioToUse.label;
            var currentPage = "";
            if (i === tpen.screen.currentFolio) {
                currentPage = "currentPage";
            }
            var lines = [];
            if (currentFolioToUse.resources && currentFolioToUse.resources.length > 0){
                lines = currentFolioToUse.resources;
                populatePreview(lines, pageLabel, currentPage);
            }
        }
}

/* Gather the annotations for a canvas and populate the preview interface with them. */
function gatherAndPopulate(currentOn, pageLabel, currentPage, i){
    var annosURL = "getAnno";
    var properties = {"@type": "sc:AnnotationList", "on" : currentOn};
    var paramOBJ = {"content": JSON.stringify(properties)};
    $.post(annosURL, paramOBJ, function(annoList){
        annoList = JSON.parse(annoList);
    });
}

/* Populate the line preview interface. */
function populatePreview(lines, pageLabel, currentPage, order){
    var letterIndex = 0;
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var previewPage = $('<div order="' + order + '" class="previewPage"><span class="previewFolioNumber">' + pageLabel + '</span></div>');
    if (lines.length === 0) {
        previewPage = $('<div order="' + order + '" class="previewPage">'
        + '<span class="previewFolioNumber">'
        + pageLabel + '</span><br>No Lines</div>');
    }
    var num = 0;
    for (var j = 0; j < lines.length; j++){
        num++;
        var col = letters[letterIndex];
        var currentLine = lines[j].on;
        var currentLineXYWH = currentLine.slice(currentLine.indexOf("#xywh=") + 6);
        currentLineXYWH = currentLineXYWH.split(",");
        var currentLineX = currentLineXYWH[0];
        var line = lines[j];
        var lineID = line["@id"];
        var lineText = line.resource["cnt:chars"];
        if (j >= 1){
            var lastLine = lines[j - 1].on;
            var lastLineXYWH = lastLine.slice(lastLine.indexOf("#xywh=") + 6);
            lastLineXYWH = lastLineXYWH.split(",");
            var lastLineX = lastLineXYWH[0];
            var abs = Math.abs(parseInt(lastLineX) - parseInt(currentLineX));
            if (abs > 0){
                letterIndex++;
                num = 0;
            }
        }
        var previewLine = $('<div class="previewLine" data-lineNumber="' + j + '">'
            + '<span class="previewLineNumber" lineserverid="' + lineID + '" data-lineNumber="' + j + '"  data-column="' + col + '"  data-lineOfColumn="' + j + '">'
            + col + '' + num + '</span>'
            + '<span class="previewText ' + currentPage + '">' + lineText + '<span class="previewLinebreak"></span></span>'
            + '<span class="previewNotes" contentEditable="(permitModify||isMember)" ></span></div>');
        previewPage.append(previewLine);
    }
    $("#previewDiv").append(previewPage);
}

function populateSpecialCharacters(specialCharacters){
    if(!specialCharacters){
        return false;
    }
    specialCharacters = JSON.parse(specialCharacters);
    var speCharactersInOrder = new Array(specialCharacters.length);
    for (var char = 0; char < specialCharacters.length; char++){
        var thisChar = specialCharacters[char];
        if (thisChar == ""){ }
        else {
            var keyVal = thisChar.key;
            var position2 = parseInt(thisChar.position);
            var newCharacter = "<option class='character'>&#" + keyVal + ";</option>";
            if (position2 - 1 >= 0 && (position2 - 1) < specialCharacters.length) {
                speCharactersInOrder[position2 - 1] = newCharacter;
            }
        }
    }
    $.each(speCharactersInOrder, function(){
        var button1 = $('' + this);
        $(".specialCharacters").append(button1);
    });
}

function populateXML(xmlTags){
    if(!xmlTags){
        return false;
    }
    xmlTags = xmlTags.split(",");
    var tagsInOrder = [];
    for (var tag = 0; tag < xmlTags.length; tag++){
        var newTagBtn = xmlTags[tag];
        if (newTagBtn !== "" && newTagBtn !== " "){
            tagsInOrder.push("<option>" + newTagBtn + "</option>");
        }
    }
    $.each(tagsInOrder, function(){
        var button = $('' + this);
        $(".xmlTags").append(button);
    });
}

/*
         * Load the transcription from the text in the text area.
         */
function loadTranscription(){
    //Object validation here.
    var projectID = tpen.project.id || 4080;
    var userTranscription = $('#transcriptionText').val();
    var currentFolio = tpen.screen.currentFolio || 0;
    if ($.isNumeric(userTranscription)){
        //The user can put the project ID in directly and a call will be made to newberry proper to grab it.
        projectID = userTranscription;
        var theProjectID = projectID;
        var url = "getProjectTPENServlet?projectID=" + projectID;
        $.ajax({
            url: url,
            type:"GET",
            success: function(activeProject){
                tpen.project.tools = activeProject.projectTool;
                tpen.project.tools = JSON.parse(tpen.project.tools);
                var count = 0;
                var url = "";
                tpen.user.current = activeProject.cuser;
                tpen.project.leaders = activeProject.ls_leader;
                tpen.project.leaders = JSON.parse(tpen.project.leaders);
                $.each(tpen.project.leaders, function(){
                    if (this.UID === parseInt(tpen.user.current)){
                        tpen.user.isAdmin = true;
                        $("#parsingBtn").show();
                        var message = $('<span>This canvas has no lines. If you would like to create lines</span>'
                            + '<span style="color: blue;" onclick="hideWorkspaceForParsing()">click here</span>.'
                            + 'Otherwise, you can <span style="color: red;" onclick="$(\'#noLineWarning\').hide()">'
                            + 'dismiss this message</span>.');
                        $("#noLineConfirmation").empty();
                        $("#noLineConfirmation").append(message);
                    }
                });
                tpen.manifest = activeProject.manifest;
                tpen.manifest = JSON.parse(tpen.manifest);
                var projectData = tpen.manifest;
                if (projectData.sequences[0] !== undefined
                    && projectData.sequences[0].canvases !== undefined
                    && projectData.sequences[0].canvases.length > 0){
                    transcriptionFolios = projectData.sequences[0].canvases;
                    scrubFolios();
                    var count = 1;
                    $.each(transcriptionFolios, function(){
                        $("#pageJump").append("<option folioNum='" + count
                            + "' class='folioJump' val='" + this.label + "'>"
                            + this.label + "</option>");
                        $("#compareJump").append("<option class='compareJump' folioNum='"
                            + count + "' val='" + this.label + "'>"
                            + this.label + "</option>");
                        count++;
                        if (this.otherContent){
                            if (this.otherContent.length > 0){
                                // all's well
                            }
                            else {
                            //otherContent was empty (IIIF says otherContent should
                            //have URI's to AnnotationLists).  We will check the
                            //store for these lists still.
                            }
                        }
                        else {
                            // no list at all, let's create a spot
                            this.otherContent = [];
                        }
                    });
                    loadTranscriptionCanvas(transcriptionFolios[0], "");
                    var projectTitle = projectData.label;
                    $("#trimTitle").text(projectTitle);
                    $("#trimTitle").attr("title", projectTitle);
                    $('#transcriptionTemplate').css("display", "inline-block");
                    $('#setTranscriptionObjectArea').hide();
                    $(".instructions").hide();
                    $(".hideme").hide();
                    //load Iframes after user check and project information data call
                    loadIframes();
                }
                else {
                    throw new Error("This transcription object is malformed. No canvas sequence is defined.");
                }
            },
            error: function(jqXHR, error, errorThrown) {
                if (jqXHR.status && jqXHR.status > 400){
                    alert(jqXHR.responseText);
                }
                else {
                    alert("Something went wrong. Could not get the project. 1");
                }
                //load Iframes after user check and project information data call
                loadIframes();
            }
        });
        $.each((tpen.project.tools || []), function(){
            var splitHeight = window.innerHeight + "px";
            var toolLabel = this.name;
            var toolSource = this.url;
            var splitTool = $('<div toolName="' + toolLabel
                + '" class="split iTool"><button class="fullScreenTrans">'
                + 'Full Screen Transcription</button></div>');
            var splitToolIframe = $('<iframe style="height:' + splitHeight
                + ';" src="' + toolSource + '"></iframe>');
            var splitToolSelector = $('<option splitter="' + toolLabel
                + '" class="splitTool">' + toolLabel + '</option>');
            splitTool.append(splitToolIframe);
            $("#splitScreenTools").append(splitToolSelector);
            $(".iTool:last").after(splitTool);
        });
        populateSpecialCharacters(tpen.project.buttons);
        populateXML(tpen.project.xml);
	}
    else if (isJSON(userTranscription)){
        tpen.manifest = userTranscription = JSON.parse(userTranscription);
        if (userTranscription.sequences[0] !== undefined
            && userTranscription.sequences[0].canvases !== undefined
            && userTranscription.sequences[0].canvases.length > 0){
            var transcriptionFolios = userTranscription.sequences[0].canvases;
            scrubFolios();
            var count = 1;
            $.each(transcriptionFolios, function(){
                $("#pageJump").append("<option folioNum='" + count
                    + "' class='folioJump' val='" + this.label + "'>"
                    + this.label + "</option>");
                $("#compareJump").append("<option class='compareJump' folioNum='"
                    + count + "' val='" + this.label + "'>"
                    + this.label + "</option>");
                count++;
                if (this.otherContent){
                    if (this.otherContent.length > 0){
                        // all's well
                    }
                    else {
                        //otherContent was empty (IIIF says otherContent should
                        //have URI's to AnnotationLists).  We will check the
                        //store for these lists still.
                    }
                }
                else {
                    // no property at all, create one for storing new annotations
                    this.otherContent=[];
                }
            });
            loadTranscriptionCanvas(transcriptionFolios[0], "");
            var projectTitle = userTranscription.label;
            $("#trimTitle").html(projectTitle);
            $("#trimTitle").attr("title", projectTitle);
            $('#transcriptionTemplate').css("display", "inline-block");
            $('#setTranscriptionObjectArea').hide();
            $(".instructions").hide();
            $(".hideme").hide();
        }
        else {
            throw new Error("This is a valid JSON object, but it cannot be read as a transcription object.");
        }
        //load Iframes after user check and project information data call
        loadIframes();
    }
    else if (userTranscription.indexOf("http://") >= 0 || userTranscription.indexOf("https://") >= 0) {
        var localProject = false;
        if (userTranscription.indexOf("/project/") > - 1){
            if (userTranscription.indexOf("t-pen.org") > - 1){
            localProject = false;
            projectID = 0; //This way, it will not grab the t-pen project id.
            }
            else {
                localProject = true; //Well, probably anyway.  I forsee this being an issue like with t-pen.
                projectID = parseInt(userTranscription.substring(userTranscription.lastIndexOf('/project/') + 9));
                theProjectID = projectID;
            }
        }
        else {
            projectID = 0;
        }
        if (localProject){
            //get project info first, get manifest out of it, populate
            var url = "getProjectTPENServlet?projectID=" + projectID;
            $.ajax({
                url: url,
                type:"GET",
                success: function(activeProject){
                    tpen.project.tools = activeProject.projectTool;
                    tpen.project.tools = JSON.parse(projectTools);
                    var count = 0;
                    var url = "";
                    if (activeProject.manifest !== undefined){
                        var manifest = activeProject.manifest;
                        tpen.manifest = JSON.parse(manifest);
                        if (tpen.manifest.sequences[0] !== undefined
                            && tpen.manifest.sequences[0].canvases !== undefined
                            && tpen.manifest.sequences[0].canvases.length > 0){
                            scrubFolios();
                            var count = 1;
                            $.each(tpen.manifest.sequences[0].canvases, function(){
                                $("#pageJump").append("<option folioNum='" + count
                                    + "' class='folioJump' val='" + this.label + "'>"
                                    + this.label + "</option>");
                                $("#compareJump").append("<option class='compareJump' folioNum='"
                                    + count + "' val='" + this.label + "'>"
                                    + this.label + "</option>");
                                count++;
                                if (this.otherContent){
                                    if (this.otherContent.length > 0){
                                        // all's well
                                    }
                                    else {
                                        // otherContent was empty (IIIF says otherContent
                                        // should have URI's to AnnotationLists).  We will
                                        // check the store for these lists still.
                                    }
                                }
                                else {
                                    // no otherContent, so create one to hold new annotations
                                    this.otherContent=[];
                                }
                            });
                            loadTranscriptionCanvas(tpen.manifest.sequences[0].canvases[0], "");
                            var projectTitle = tpen.manifest.label || tpen.manifest['@id'] || "unlabelled";
                            $("#trimTitle").html(projectTitle);
                            $("#trimTitle").attr("title", projectTitle);
                            $('#transcriptionTemplate').css("display", "inline-block");
                            $('#setTranscriptionObjectArea').hide();
                            $(".instructions").hide();
                            $(".hideme").hide();
                        }
                        else {
                        //ERROR! It is a malformed transcription object.  There is no canvas sequence defined.
                        }
                        //load Iframes after user check and project information data call
                        loadIframes();
                    }
                    else {
                        alert("No Manifest Found");
                        //load Iframes after user check and project information data call
                        loadIframes();
                    }
                    $.each(tpen.project.tools, function(){
                        var splitHeight = window.innerHeight + "px";
                        var toolLabel = this.name;
                        var toolSource = this.url;
                        var splitTool = $('<div toolName="' + toolLabel
                            + '" class="split iTool"><button class="fullScreenTrans">Full Screen Transcription</button></div>');
                        var splitToolIframe = $('<iframe style="height:'
                            + splitHeight + ';" src="' + toolSource + '"></iframe>');
                        var splitToolSelector = $('<option splitter="'
                            + toolLabel + '" class="splitTool">' + toolLabel + '</option>');
                        splitTool.append(splitToolIframe);
                        $("#splitScreenTools").append(splitToolSelector);
                        $(".iTool:last").after(splitTool);
                    });
                    populateSpecialCharacters(activeProject.projectButtons);
                    populateXML(activeProject.xml);
                },
                error: function(jqXHR, error, errorThrown) {
                    if (jqXHR.status && jqXHR.status > 400){
                        alert(jqXHR.responseText);
                    }
                    else {
                        alert("Something went wrong. Could not get the project. 4");
                    }
                }
            });
        }
        else {
        //it is not a local project, so just grab the url that was input and request the manifest.
        var url = userTranscription;
        $.ajax({
            url: url,
            success: function(projectData){
                if (projectData.sequences[0] !== undefined
                    && projectData.sequences[0].canvases !== undefined
                    && projectData.sequences[0].canvases.length > 0){
                    transcriptionFolios = projectData.sequences[0].canvases;
                    scrubFolios();
                    var count = 1;
                    $.each(transcriptionFolios, function(){
                        $("#pageJump").append("<option folioNum='" + count
                            + "' class='folioJump' val='" + this.label + "'>"
                            + this.label + "</option>");
                        $("#compareJump").append("<option class='compareJump' folioNum='"
                            + count + "' val='" + this.label + "'>"
                            + this.label + "</option>");
                        count++;
                        if (this.otherContent){
                            if (this.otherContent.length > 0){
                                // all's well
                            }
                            else {
                                //otherContent was empty (IIIF says otherContent
                                //should have URI's to AnnotationLists).  We will
                                //check the store for these lists still.
                                console.warn("`otherContent` exists, but has no content.");
                            }
                        }
                        else {
                            console.warn("`otherContent` does not exist in this Manifest.");
                        }
                    });
                    loadTranscriptionCanvas(transcriptionFolios[0], "");
                    var projectTitle = projectData.label;
                    $("#trimTitle").html(projectTitle);
                    $("#trimTitle").attr("title", projectTitle); $('#transcriptionTemplate').css("display", "inline-block");
                    $('#setTranscriptionObjectArea').hide();
                    $(".instructions").hide();
                    $(".hideme").hide();
                }
                else {
                    throw new Error("Malformed transcription object. There is no canvas sequence defined.");
                }
                //load Iframes after user check and project information data call
                loadIframes();
            },
            error: function(jqXHR, error, errorThrown) {
                if (jqXHR.status && jqXHR.status > 400){
                    alert(jqXHR.responseText);
                }
                else {
                    throw error;
                }
                //load Iframes after user check and project information data call
                loadIframes();
            }
        });
    }
    }
    else {
        throw new Error("The input was invalid.");
    }
}

/*
 * Load a canvas from the manifest to the transcription interface.
 */
function loadTranscriptionCanvas(canvasObj, parsing){
    var noLines = true;
    var canvasAnnoList = "";
    $("#imgTop, #imgBottom").css("height", "400px");
    $("#imgTop img, #imgBottom img").css("height", "400px");
    $("#imgTop img, #imgBottom img").css("width", "auto");
    $("#prevColLine").html("**");
    $("#currentColLine").html("**");
    $('.transcriptionImage').attr('src', "images/loading2.gif"); //background loader if there is a hang time waiting for image
    $('.lineColIndicator').remove();
    $(".transcriptlet").remove();
    var pageTitle = canvasObj.label;
    $("#trimPage").html(pageTitle);
    $("#trimPage").attr("title", pageTitle);
    $('#transcriptionTemplate').css("display", "inline-block");
    $("#parsingBtn").css("box-shadow", "none");
    $("#parsingButton").removeAttr('disabled');
    $(".lineColIndicator").css({
        "box-shadow": "rgba(255, 255, 255, 0.4)",
        "border": "1px solid rgb(255, 255, 255)"
    });
    $(".lineColOnLine").css({
        "border-left": "1px solid rgba(255, 255, 255, 0.2);",
        "color": "rgb(255, 255, 255)"
    });
    //Move up all image annos
    var cnt = - 1;
    if (canvasObj.images[0].resource['@id'] !== undefined
        && canvasObj.images[0].resource['@id'] !== ""){ //Only one image
        var image = new Image();
        $(image)
        .on("load", function() {
            $("#imgTop, #imgTop img, #imgBottom img, #imgBottom, #transcriptionCanvas").css("height", "auto");
            $("#imgTop img, #imgBottom img").css("width", "100%");
            $("#imgBottom").css("height", "inherit");
            $('.transcriptionImage').attr('src', canvasObj.images[0].resource['@id'].replace('amp;', ''));
            $("#fullPageImg").attr("src", canvasObj.images[0].resource['@id'].replace('amp;', ''));
            originalCanvasHeight2 = $("#imgTop img").height();
            originalCanvasWidth2 = $("#imgTop img").width();
            drawLinesToCanvas(canvasObj, parsing);
            $("#transcriptionCanvas").attr("canvasid", canvasObj["@id"]);
            $("#transcriptionCanvas").attr("annoList", canvasAnnoList);
            $("#parseOptions").find(".tpenButton").removeAttr("disabled");
            $("#parsingBtn").removeAttr("disabled");
        })
        .on("error", function(){
            var image2 = new Image();
            $(image2)
            .on("load", function(){
                $("#noLineWarning").hide();
                $("#imgTop, #imgTop img, #imgBottom img, #imgBottom, #transcriptionCanvas").css("height", "auto");
                $("#imgTop img, #imgBottom img").css("width", "100%");
                $('.transcriptionImage').attr('src', "images/missingImage.png");
                $("#fullPageImg").attr("src", "images/missingImage.png");
                $('#transcriptionCanvas').css('height', $("#imgTop img").height() + "px");
                $('.lineColIndicatorArea').css('height', $("#imgTop img").height() + "px");
                $("#imgTop").css("height", "0%");
                $("#imgBottom img").css("top", "0px");
                $("#imgBottom").css("height", "inherit");
                $("#parsingButton").attr("disabled", "disabled");
                alert("No image for this canvas or it could not be resolved.  Not drawing lines.");
                $("#parseOptions").find(".tpenButton").attr("disabled", "disabled");
                $("#parsingBtn").attr("disabled", "disabled");
            })
            .attr("src", "images/missingImage.png");
        })
        .attr("src", canvasObj.images[0].resource['@id'].replace('amp;', ''));
    }
    else {
        $('.transcriptionImage').attr('src', "images/missingImage.png");
        throw Error("The canvas is malformed.  No 'images' field in canvas object or images:[0]['@id'] does not exist.  Cannot draw lines.");
    }
    $(".previewText").removeClass("currentPage");
    $.each($("#previewDiv").children(".previewPage:eq(" + (parseInt(tpen.screen.currentFolio) - 1) + ")").find(".previewLine"), function(){
        $(this).find('.previewText').addClass("currentPage");
    });
    createPreviewPages(); //each time you load a canvas to the screen with all of its updates, remake the preview pages.
}

/*
 * @paran canvasObj  A canvas object to extract transcription lines from and draw to the interface.
 * @param parsing boolean if parsing is live tool
 */
function drawLinesToCanvas(canvasObj, parsing){
    var lines = [];
    var currentFolio = parseInt(tpen.screen.currentFolio);
    if (canvasObj.resources !== undefined
        && canvasObj.resources.length > 0){
        for (var i = 0; i < canvasObj.resources.length; i++){
            if (isJSON(canvasObj.resources[i])){   // it is directly an annotation
                lines.push(canvasObj.resources[i]);
            }
        }
        linesToScreen(lines);
    }
    else {
        // we have the anno list for this canvas (potentially), so query for it.
        // If not found, then consider this an empty canvas.
        var annosURL = "getAnno";
        var onValue = canvasObj["@id"];
        var properties = {"@type": "sc:AnnotationList", "on" : onValue};
        var paramOBJ = {"content": JSON.stringify(properties)};
        $.post(annosURL, paramOBJ, function(annoList){
            if (!tpen.manifest.sequences[0].canvases[currentFolio]){
                throw new Error("Missing canvas:" +currentFolio);
            }
            if(!tpen.manifest.sequences[0].canvases[currentFolio].otherContent){
                tpen.manifest.sequences[0].canvases[currentFolio].otherContent = [];
            }
            var annoList = tpen.manifest.sequences[0].canvases[currentFolio].otherContent = tpen.manifest.sequences[0].canvases[currentFolio].otherContent.concat(JSON.parse(annoList));
            var currentList = {};
            if (annoList.length > 0){
                // Always default to the master list, which was the first list created
                // for the canvas.  That way, the annotation lists associated with
                // the master are still supported.
                var masterList = {};
                $.each(annoList, function(){
                    //if we find the master list, make that the default
                    if (this.proj === "master"){
                        masterList = this;
                        lines = this.resources;
                        currentList = this;
                        // TODO we do not want someone who is not an admin to be able
                        // to edit this list.  Do a check here and make
                    }
                    if (this.proj !== undefined
                        && this.proj !== ""
                        && this.proj == theProjectID){
                        // These are the lines we want to draw because the projectID matches.  Overwrite master if necessary.
                        lines = this.resources;
                        currentList = this;
                        return false;
                    }
                    else{
                        // It is an annotation list for this canvas in a different project.
                        // We have defaulted to master already.
                    }
                });
                if (lines.length > 0){
                    $("#transTemplateLoading").hide();
                    $("#transcriptionTemplate").show();
                    linesToScreen(lines);
                }
                else { //list has no lines
                    if (!parsing){
                        $("#noLineWarning").show();
                    }
                    $("#transTemplateLoading").hide();
                    $("#transcriptionTemplate").show();
                    $('#transcriptionCanvas').css('height', $("#imgTop img").height() + "px");
                    $('.lineColIndicatorArea').css('height', $("#imgTop img").height() + "px");
                    $("#imgTop").css("height", $("#imgTop img").height() + "px");
                    $("#imgTop img").css("top", "0px");
                    $("#imgBottom").css("height", "inherit");
                    $("#parsingBtn").css("box-shadow", "0px 0px 6px 5px yellow");
                }
            }
            else {
                // couldnt get list.  one should always exist, even if empty.
                // We will say no list and changes will be stored locally to the canvas.
                if (parsing !== "parsing") {
                    $("#noLineWarning").show();
                }
                $("#transTemplateLoading").hide();
                $("#transcriptionTemplate").show();
                $('#transcriptionCanvas').css('height', $("#imgTop img").height() + "px");
                $('.lineColIndicatorArea').css('height', $("#imgTop img").height() + "px");
                $("#imgTop").css("height", "0%");
                $("#imgBottom img").css("top", "0px");
                $("#imgBottom").css("height", "inherit");
                $("#parsingBtn").css("box-shadow", "0px 0px 6px 5px yellow");
            }
        });
    }
}

/* Take line data, turn it into HTML elements and put them to the DOM */
function linesToScreen(lines){
    $("#noLineWarning").hide();
    var letterIndex = 0;
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    letters = letters.split("");
    var update = true;
    if ($("#parsingDiv").is(":visible")){
        update = false; // TODO: Is this just a tpen.screen.liveTool check?
    }
    var thisContent = "";
    var thisPlaceholder = "Enter a line transcription";
    var counter = 0;
    var colCounter = 0;
    var image = $('#imgTop img');
    var theHeight = image.height();
    var theWidth = image.width();
    $('#transcriptionCanvas').css('height', originalCanvasHeight2 + "px");
    $('.lineColIndicatorArea').css('height', originalCanvasHeight2 + "px");
    var ratio = 0;
    //should be the same as originalCanvasWidth2/originalCanvasHeight2
    ratio = theWidth / theHeight;
    adjustRatio = ratio;
    for (var i = 0; i < lines.length; i++){
        var line = lines[i];
        var lastLine = {};
        var col = letters[letterIndex];
        if (i > 0)lastLine = lines[i - 1];
        var lastLineX = 10000;
        var lastLineWidth = - 1;
        var lastLineTop = - 2;
        var lastLineHeight = - 2;
        var x, y, w, h = 0;
        var XYWHarray = [x, y, w, h];
        var lineURL = "";
        var lineID = - 1;
        if (line.on !== undefined){
            lineURL = line.on;
        }
        else {
            //ERROR.  malformed line.
            update = false;
        }
        if (line["@id"] !== undefined && line["@id"] !== ""){
            lineID = line['@id'];
        }
        else {
            //ERROR.  Malformed line.
            update = false;
        }
        thisContent = "";
        if (lineURL.indexOf('#') > - 1){ //string must contain this to be valid
            var XYWHsubstring = lineURL.substring(lineURL.lastIndexOf('#' + 1)); //xywh = 'x,y,w,h'
            if (lastLine.on){ //won't be true for first line
                var xywh = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")
                lastLineX = xywh[0];
                lastLineWidth = xywh[2];
                lastLineTop = xywh[1];
                lastLineHeight = xywh[3];
            }
            else if (i === 0 && lines.length > 1){ // Check for the variance with the first line
                lastLine = lines[0];
                if (lastLine.on){
                    lastLineX = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[0];
                    lastLineWidth = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[2];
                    lastLineTop = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[1];
                    lastLineHeight = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[3];
                }
            }
            if (XYWHsubstring.indexOf('xywh=') > - 1){ //string must contain this to be valid
                var numberArray = XYWHsubstring.substring(lineURL.lastIndexOf('xywh=') + 5).split(',');
                if (parseInt(lastLineTop) + parseInt(lastLineHeight) !== numberArray[1]){
                //check for slight variance in top position.  Happens because of rounding percentage math that gets pixels to be an integer.
                    var num1 = parseInt(lastLineTop) + parseInt(lastLineHeight);
                    if (Math.abs(num1 - numberArray[1]) <= 4 && Math.abs(num1 - numberArray[1]) !== 0){
                        numberArray[1] = num1;
                        var newString = numberArray[0] + "," + num1 + "," + numberArray[2] + "," + numberArray[3];
                        if (i > 0){
                        //to make the change cascade to the rest of the lines,
                        // we actually have to update the #xywh of the current
                        // line with the new value for y.
                            var lineOn = lineURL;
                            var index = lineOn.indexOf("#xywh=") + 6;
                            var newLineOn = lineOn.substr(0, index) + newString + lineOn.substr(index + newString.length);
                            lines[i].on = newLineOn;
                        }
                    }
                }
                if (numberArray.length === 4){ // string must have all 4 to be valid
                    x = numberArray[0];
                    w = numberArray[2];
                    if (lastLineX !== x){
                        //check if the last line's x value is equal to this
                        // line's x value (means same column)
                        if (Math.abs(x - lastLineX) <= 3){
                            //allow a 3 pixel  variance and fix this variance when necessary...
                        //align them, call them the same Column.
                /*
                 * This is a consequence of #xywh for a resource needing to be an integer.  When I calculate its integer position off of
                 * percentages, it is often a float and I have to round to write back.  This can cause a 1 or 2 pixel discrenpency, which I account
                 * for here.  There may be better ways of handling this, but this is a good solution for now.
                 */
                            if (lastLineWidth !== w){ //within "same" column (based on 3px variance).  Check the width
                                if (Math.abs(w - lastLineWidth) <= 5){
                                    // If the width of the line is within five pixels,
                                    // automatically make the width equal to the last line's width.

                                    //align them, call them the same Column.
                            /*
                             * This is a consequence of #xywh for a resource needing to be an integer.  When I calculate its intger position off of
                             * percentages, it is often a float and I have to round to write back.  This can cause a 1 or 2 pixel discrenpency, which I account
                             * for here.  There may be better ways of handling this, but this is a good solution for now.
                             */
                                    w = lastLineWidth;
                                        numberArray[2] = w;
                                }
                            }
                            x = lastLineX;
                            numberArray[0] = x;
                        }
                        else { //we are in a new column, column indicator needs to increase.
                            letterIndex++;
                            col = letters[letterIndex];
                            colCounter = 0; //Reset line counter so that when the column changes the line# restarts
                        }
                    }
                    else {
                        // X value matches, we are in the same column and don't
                        // have to account for any variance or update the array.
                        // Still check for slight width variance..
                        if (lastLineWidth !== w){
                            if (Math.abs(w - lastLineWidth) <= 5){ //within 5 pixels...
                                //align them, call them the same Column.
                                /* This is a consequence of #xywh for a resource needing to be an integer.  When I calculate its intger position off of
* percentages, it is often a float and I have to round to write back.  This can cause a 1 or 2 pixel discrenpency, which I account
* for here.  There may be better ways of handling this, but this is a good solution for now. */
                                w = lastLineWidth;
                                numberArray[2] = w;
                            }
                        }
                    }
                    y = numberArray[1];
                    h = numberArray[3];
                    XYWHarray = [x, y, w, h];
                }
                else {
                    //ERROR! Malformed line
                    update = false;
                }
            }
            else {
                //ERROR! Malformed line
                update = false;
            }
        }
        else {
            //ERROR!  Malformed line.
            update = false;
        }
        if (line.resource['cnt:chars'] !== undefined
            && line.resource['cnt:chars'] !== "") {
            thisContent = line.resource['cnt:chars'];
        }
        counter++;
        var newAnno = $('<div id="transcriptlet_' + counter + '" col="' + col
            + '" colLineNum="' + colCounter + '" lineID="' + counter
            + '" lineserverid="' + lineID + '" class="transcriptlet" data-answer="'
            + thisContent + '"><textarea placeholder="' + thisPlaceholder + '">'
            + thisContent + '</textarea></div>');
        // 1000 is promised, 10 goes to %
        var left = parseFloat(XYWHarray[0]) / (10 * ratio);
        var top = parseFloat(XYWHarray[1]) / 10;
        var width = parseFloat(XYWHarray[2]) / (10 * ratio);
        var height = parseFloat(XYWHarray[3]) / 10;
        newAnno.attr({
            lineLeft: left,
                lineTop: top,
                lineWidth: width,
                lineHeight: height,
                counter: counter
        });
        colCounter++;
        $("#transcriptletArea").append(newAnno);
        var lineColumnIndicator = $("<div onclick='loadTranscriptlet(" + counter + ");' pair='" + col + "" + colCounter
            + "' lineserverid='" + lineID + "' lineID='" + counter + "' class='lineColIndicator' style='left:"
            + left + "%; top:" + top + "%; width:" + width + "%; height:" + height + "%;'><div class='lineColOnLine' >"
            + col + "" + colCounter + "</div></div>");
        var fullPageLineColumnIndicator = $("<div pair='" + col + "" + colCounter + "' lineserverid='" + lineID
            + "' lineID='" + counter + "' class='lineColIndicator fullP' onclick=\"updatePresentation($('#transcriptlet_" + counter + "'));\""
            + " style='left:" + left + "%; top:" + top + "%; width:" + width + "%; height:"
            + height + "%;'><div class='lineColOnLine' >" + col + "" + colCounter + "</div></div>");
        // TODO: add click event to update presentation
        // Make sure the col/line pair sits vertically in the middle of the outlined line.
        var lineHeight = theHeight * (height / 100) + "px";
        lineColumnIndicator.find('.lineColOnLine').attr("style", "line-height:" + lineHeight + ";");
        //Put to the DOM
        $(".lineColIndicatorArea").append(lineColumnIndicator);
        $("#fullPageSplitCanvas").append(fullPageLineColumnIndicator);
    }
    if (update && $(".transcriptlet").eq(0) !== undefined){
        updatePresentation($(".transcriptlet").eq(0));
    }
    // we want automatic updating for the lines these texareas correspond to.
    var typingTimer; //timer identifier
    $("textarea")
        .keydown(function(e){
        //user has begun typing, clear the wait for an update
        clearTimeout(typingTimer);
    })
        .keyup(function(e){
            var lineToUpdate = $(this).parent();
            clearTimeout(typingTimer);
            //when a user stops typing for 2 seconds, fire an update to get the new text.
            typingTimer = setTimeout(function(){
                updateLine(lineToUpdate, "no");
            }, 2000);
    });
}

/* Make the transcription interface focus to the transcriptlet passed in as the parameter. */
function updatePresentation(transcriptlet) {
    if (transcriptlet === undefined || transcriptlet === null){
        $("#imgTop").css("height", "0%");
        $("#imgBottom").css("height", "inherit");
        return false;
    }
    var nextCol = transcriptlet.attr("col");
    var nextLineNum = parseInt(transcriptlet.attr("collinenum")) + 1;
    var transcriptletBefore = $(transcriptlet.prev());
    var nextColLine = nextCol + "" + nextLineNum;
    $("#currentColLine").html(nextColLine);
    if (parseInt(nextLineNum) >= 1){
        if (transcriptletBefore.length > 0){
        var currentTranscriptletNum = parseInt(transcriptletBefore.attr("collinenum")) + 1;
            if (transcriptletBefore.length > 0){ }
            else{ }
            var prevLineCol = transcriptletBefore.attr("col");
            var prevLineText = transcriptletBefore.attr("data-answer");
            $("#prevColLine").html(prevLineCol + "" + currentTranscriptletNum);
            $("#captionsText").html((prevLineText.length && prevLineText) || "This line is not transcribed.");
        }
        else { //this is a problem
            $("#prevColLine").html("**");
            $("#captionsText").html("You are on the first line.");
        }
    }
    else { //there is no previous line
        $("#prevColLine").html("**");
        $("#captionsText").html("ERROR.  NUMBERS ARE OFF");
    }
    tpen.screen.focusItem[0] = tpen.screen.focusItem[1];
    tpen.screen.focusItem[1] = transcriptlet;
    if ((tpen.screen.focusItem[0] === null)
        || (tpen.screen.focusItem[0].attr("id") !== tpen.screen.focusItem[1].attr("id"))) {
        this.adjustImgs(this.setPositions());
        this.swapTranscriptlet();
        // show previous line transcription
        $('#captions').animate({
            opacity: 1
        }, 100);
    }
    else {
        this.adjustImgs(this.setPositions());
        tpen.screen.focusItem[1].prevAll(".transcriptlet").addClass("transcriptletBefore").removeClass("transcriptletAfter");
        tpen.screen.focusItem[1].nextAll(".transcriptlet").addClass("transcriptletAfter").removeClass("transcriptletBefore");
    }
    // prevent textareas from going invisible and not moving out of the workspace
    tpen.screen.focusItem[1].removeClass("transcriptletBefore transcriptletAfter");
};

/* Helper for position focus onto a specific transcriptlet */
function setPositions() {
    // Determine size of section above workspace
    var bottomImageHeight = $("#imgBottom img").height();
    if (tpen.screen.focusItem[1].attr("lineHeight") !== null) {
        var pairForBookmarkCol = tpen.screen.focusItem[1].attr('col');
        var pairForBookmarkLine = parseInt(tpen.screen.focusItem[1].attr('collinenum'));
        pairForBookmarkLine++;
        var pairForBookmark = pairForBookmarkCol + pairForBookmarkLine;
        var currentLineHeight = parseFloat(tpen.screen.focusItem[1].attr("lineHeight"));
        var currentLineTop = parseFloat(tpen.screen.focusItem[1].attr("lineTop"));
        // top of column
        var previousLine = (tpen.screen.focusItem[1].prev().is('.transcriptlet')
            && (currentLineTop > parseFloat(tpen.screen.focusItem[1].prev().attr("lineTop"))))
            ? parseFloat(tpen.screen.focusItem[1].prev().attr("lineHeight"))
            : parseFloat(tpen.screen.focusItem[1].attr("lineTop"));
        // oversized for screen
        var imgTopHeight = (previousLine + currentLineHeight) + 1.5; // obscure behind workspace.
        var topImgPositionPercent = ((previousLine - currentLineTop) * 100) / imgTopHeight;
        var topImgPositionPx = (previousLine - currentLineTop) * bottomImageHeight / 100;
        var bottomImgPositionPercent = - (currentLineTop + currentLineHeight);
        var bottomImgPositionPx = - (currentLineTop + currentLineHeight) * bottomImageHeight / 100;
    }
    var positions = {
        imgTopHeight: imgTopHeight,
        topImgPositionPercent: topImgPositionPercent,
        topImgPositionPx : topImgPositionPx,
        bottomImgPositionPercent: bottomImgPositionPercent,
        bottomImgPositionPx: bottomImgPositionPx,
        activeLine: pairForBookmark
    };
    return positions;
}

/**
* Removes previous textarea and slides in the new focus.
*
* @see updatePresentation()
*/
function swapTranscriptlet() {
    // slide in the new transcriptlet
    tpen.screen.focusItem[1].css({"width": "auto", "z-index": "5"});
    tpen.screen.focusItem[1].removeClass("transcriptletBefore transcriptletAfter");
    tpen.screen.focusItem[1].prevAll(".transcriptlet").addClass("transcriptletBefore").removeClass("transcriptletAfter");
    tpen.screen.focusItem[1].nextAll(".transcriptlet").addClass("transcriptletAfter").removeClass("transcriptletBefore");
    if ($('.transcriptletAfter').length === 0){
        $('#nextTranscriptlet').hide();
    }
    else {
        $('#nextTranscriptlet').show();
    }
    if ($('.transcriptletBefore').length === 0){
        $('#previousTranscriptlet').hide();
    }
    else {
        $('#previousTranscriptlet').show();
    }
}

/**
 * Aligns images and workspace using defined dimensions.
 *
 * @see maintainWorkspace()
*/
function adjustImgs(positions) {
    //move background images above and below the workspace
    var lineToMakeActive = $(".lineColIndicator[pair='" + positions.activeLine + "']:first");
    var topImageHeight = $("#imgTop img").height();
    $("#imgTop")
        .animate({
            "height": positions.imgTopHeight + "%"
            }, 250)
        .find("img").animate({
            top: positions.topImgPositionPx + "px",
            left: "0px"
        }, 250);
    $("#imgTop .lineColIndicatorArea")
        .animate({
            top: positions.topImgPositionPx + "px",
            left: "0px"
        }, 250);
    $("#imgBottom").find("img")
        .animate({
            top: positions.bottomImgPositionPx + "px",
            left: "0px"
        }, 250);
    $("#imgBottom .lineColIndicatorArea")
        .animate({
            top: positions.bottomImgPositionPx + "px",
            left: "0px"
        }, 250);
    if ($('.activeLine').hasClass('linesHidden')){
        $('.activeLine').hide();
    }
    $(".lineColIndicator")
        .removeClass('activeLine')
        .css({
            "box-shadow": "none",
            "background-color":"transparent"
        });
    lineToMakeActive.addClass("activeLine");
    // use the active line color to give the active line a little background color
    // to make it stand out if the box shadow is not enough.
    var activeLineColor = tpen.screen.colorThisTime.replace(".4", ".2");
    $('.activeLine').css({
        'box-shadow': '0px 0px 15px 8px ' + tpen.screen.colorThisTime
    });
}

/* Update the line information of the line currently focused on, then load the focus to a line that was clicked on */
function loadTranscriptlet(lineid){
    var currentLineServerID = tpen.screen.focusItem[1].attr("lineserverid");
    if ($('#transcriptlet_' + lineid).length > 0){
        if (tpen.user.current){
            var lineToUpdate = $(".transcriptlet[lineserverid='" + currentLineServerID + "']");
            updateLine(lineToUpdate, "no");
            updatePresentation($('#transcriptlet_' + lineid));
        }
        else {
        var captionText1 = $("#captionsText").html();
            $("#captionsText").html("You are not logged in.");
            $('#captionsText').css("background-color", 'red');
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
            setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText1); }, 1500);
        }
    }
    else { //blink a caption warning
        var captionText = $("#captionsText").html();
        $("#captionsText").html("Cannot load this line.");
        $('#captionsText').css("background-color", 'red');
        setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
        setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
        setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText); }, 1500);
    }
}

/*
             * The UI control for going the the next transcriptlet in the transcription.
             */
function nextTranscriptlet() {
    var thisLine = tpen.screen.focusItem[1].attr('lineID');
    thisLine++;
    var nextID = thisLine;
    var currentLineServerID = tpen.screen.focusItem[1].attr("lineserverid");
    if ($('#transcriptlet_' + nextID).length > 0){
        if (tpen.user.current){
            var lineToUpdate = $(".transcriptlet[lineserverid='" + currentLineServerID + "']");
            updateLine(lineToUpdate, "no");
            updatePresentation($('#transcriptlet_' + nextID));
        }
        else {
            var captionText1 = $("#captionsText").html();
            $("#captionsText").html("You are not logged in.");
            $('#captionsText').css("background-color", 'red');
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
            setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText1); }, 1500);
        }
    }
    else { //blink a caption warning
        var captionText = $("#captionsText").html();
        $("#captionsText").html("You are on the last line! ");
        $('#captionsText').css("background-color", 'red');
        setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
        setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
        setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText); }, 1500);
    }
}

/*
             * The UI control for going the the previous transcriptlet in the transcription.
             */
function previousTranscriptlet() {
    var prevID = parseFloat(tpen.screen.focusItem[1].attr('lineID')) - 1;
    var currentLineServerID = tpen.screen.focusItem[1].attr("lineServerID");
    if (prevID >= 0){
        if (tpen.user.current){
            var lineToUpdate = $(".transcriptlet[lineserverid='" + currentLineServerID + "']");
            updateLine(lineToUpdate, "no");
            updatePresentation($('#transcriptlet_' + prevID));
        }
        else {
            var captionText1 = $("#captionsText").html();
            $("#captionsText").html("You are not logged in.");
            $('#captionsText').css("background-color", 'red');
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
            setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); $("#captionsText").html(captionText1); }, 1500);
        }
    }
    else {
        //captions already say "You are on the first line"
    }
}

function scrub(thisText){
    var workingText = $("<div/>").text(thisText).html();
    var encodedText = [workingText];
    if (workingText.indexOf("&gt;") > - 1){
        var open = workingText.indexOf("&lt;");
        var beginTags = new Array();
        var endTags = new Array();
        var i = 0;
        while (open > - 1){
            beginTags[i] = open;
            var close = workingText.indexOf("&gt;", beginTags[i]);
            if (close > - 1){
                endTags[i] = (close + 4);
            } else {
                beginTags[0] = null;
                break;
            }
            open = workingText.indexOf("&lt;", endTags[i]);
            i++;
        }
        //use endTags because it might be 1 shorter than beginTags
        var oeLen = endTags.length;
        encodedText = [workingText.substring(0, beginTags[0])];
        for (i = 0; i < oeLen; i++){
            encodedText.push("<span class='previewTag'>",
            workingText.substring(beginTags[i], endTags[i]),"</span>");
            if (i !== oeLen - 1){
                encodedText.push(workingText.substring(endTags[i], beginTags[i + 1]));
            }
        }
        if (oeLen > 0){
            encodedText.push(workingText.substring(endTags[oeLen - 1]));
        }
    }
    return encodedText.join("");
}

/**
 *
 * Allows workspace to be moved up and down on the screen.
 * Requires shift key to be held down.
 */
function moveWorkspace(evt){
    $("#imgTop,#imgBottom,#imgBottom img").addClass('noTransition');
    var startImgTop = $("#imgTop").height();
    var startImgBottom = $("#imgBottom img").position().top;
    var startImgBottomH = $("#imgBottom").height();
    var mousedownPosition = evt.pageY;
    evt.preventDefault();
    $(dragHelper).appendTo("body");
    $(document)
    .disableSelection()
    .mousemove(function(event){
        var imgBtmSpot = startImgBottom - (event.pageY - mousedownPosition);
        $("#imgTop").height(startImgTop + event.pageY - mousedownPosition);
        $("#imgBottom").css({
            "height": startImgBottomH - (event.pageY - mousedownPosition)
        })
        .find("img").css({
            "top"   : startImgBottom - (event.pageY - mousedownPosition)
        });
        $("#imgBottom .lineColIndicatorArea").css("top", startImgBottom - (event.pageY - mousedownPosition) + "px");
        $("#dragHelper").css({
            top :   event.pageY - 90,
            left:   event.pageX - 90
        });
    })
    .mouseup(function(){
        $("#dragHelper").remove();
        $("#imgTop,#imgBottom,#imgBottom img").removeClass('noTransition');
        $(document)
            .enableSelection()
            .unbind("mousemove");
        isUnadjusted = false;
    });
}

/* Start event listening to move the image in the transcirption interface */
function startMoveImg(){
    if ($(".transcriptlet:first").hasClass("moveImage")){
        $("#moveImage").removeClass("selected");
        $(".transcriptlet").removeClass("moveImage");
        $(".transcriptlet").children("textarea").removeAttr("disabled");
        $("#imgTop, #imgBottom").css("cursor", "default");
        $("#imgTop,#imgBottom").unbind("mousedown");
    }
    else {
        $("#moveImage").addClass("selected");
        $(".transcriptlet").addClass("moveImage");
        $(".transcriptlet").children("textarea").attr("disabled", "");
        $("#imgTop, #imgBottom").css("cursor", "url(" + "images/open_grab.png),auto");
        $("#imgTop,#imgBottom").mousedown(function(event){moveImg(event); });
    }
}

/**
* Allows manuscript image to be moved around.
* Requires shift key to be held down.
* Synchronizes movement of top and bottom images.
* Bookmark bounding box moves with top image.
* @param event Event
*/
function moveImg(event){
    var startImgPositionX = parseFloat($("#imgTop img").css("left"));
    var startImgPositionY = parseInt($("#imgTop img").css("top"));
    var startBottomImgPositionX = parseInt($("#imgBottom img").css("left"));
    var startBottomImgPositionY = parseInt($("#imgBottom img").css("top"));
    var mousedownPositionX = event.pageX;
    var mousedownPositionY = event.pageY;
    event.preventDefault();
    $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark").addClass('noTransition');
    $("#imgTop, #imgBottom").css("cursor", "url(images/close_grab.png),auto");
    $(document)
    .disableSelection()
    .mousemove(function(event){
        $("#imgTop img").css({
            top :   startImgPositionY + event.pageY - mousedownPositionY,
            left:   startImgPositionX + event.pageX - mousedownPositionX
        });
        $("#imgTop .lineColIndicatorArea").css({
            top :   startImgPositionY + event.pageY - mousedownPositionY,
            left:   startImgPositionX + event.pageX - mousedownPositionX
        });
        $("#imgBottom img").css({
            top :   startBottomImgPositionY + event.pageY - mousedownPositionY,
            left:   startBottomImgPositionX + event.pageX - mousedownPositionX
        });
        $("#imgBottom .lineColIndicatorArea").css({
            top :   startBottomImgPositionY + event.pageY - mousedownPositionY,
            left:   startBottomImgPositionX + event.pageX - mousedownPositionX
        });
        if (!event.altKey) unShiftInterface();
    })
    .mouseup(function(){
        $("#dragHelper").remove();
        $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark").removeClass('noTransition');
        if (!tpen.screen.isMagnifying)$("#imgTop, #imgBottom").css("cursor", "url(images/open_grab.png),auto");
        $(document)
        .enableSelection()
        .unbind("mousemove");
        isUnadjusted = false;
    });
}

function restoreWorkspace(){
    $("#imgBottom").show();
    $("#imgTop").show();
    $("#imgTop").removeClass("fixingParsing");
    $("#transWorkspace").show();
    $("#imgTop").css("width", "100%");
    $("#imgTop img").css({"height":"auto", "width":"100%"});
    updatePresentation(tpen.screen.focusItem[1]);
    $(".hideMe").show();
    $(".showMe").hide();
    var pageJumpIcons = $("#pageJump").parent().find("i");
    pageJumpIcons[0].setAttribute('onclick', 'firstFolio();');
    pageJumpIcons[1].setAttribute('onclick', 'previousFolio();');
    pageJumpIcons[2].setAttribute('onclick', 'nextFolio();');
    pageJumpIcons[3].setAttribute('onclick', 'lastFolio();');
    $("#prevCanvas").attr("onclick", "previousFolio();");
    $("#nextCanvas").attr("onclick", "nextFolio();");
    $("#pageJump").removeAttr("disabled");
}

function hideWorkspaceToSeeImage(){
    $("#transWorkspace").hide();
    $("#imgTop").hide();
    $("#imgBottom img").css({
        "top" :"0%",
        "left":"0%"
    });
    $("#imgBottom .lineColIndicatorArea").css({
        "top": "0%"
    });
    $(".hideMe").hide();
    $(".showMe").show();
}

function magnify(img, event){
    //For separating out different imgs on which to zoom.
    //Right now it is just the transcription canvas.
    if (img === "trans"){
        img = $("#transcriptionTemplate");
        $("#magnifyTools").fadeIn(800);
        $("button[magnifyimg='trans']").addClass("selected");
    }
    else if (img === "compare"){
        img = $("#compareSplit");
        $("#magnifyTools").fadeIn(800).css({
            "left":$("#compareSplit").css("left"),
            "top" : "100px"
        });
        $("button[magnifyimg='compare']").addClass("selected");
    }
    else if (img === "full"){
        img = $("#fullPageSplitCanvas");
        $("#magnifyTools").fadeIn(800).css({
            "left":$("#fullPageSplit").css("left"),
            "top" : "100px"
        });
        $("button[magnifyimg='full']").addClass("selected");
    }
    $("#zoomDiv").show();
    $(".magnifyHelp").show();
    hideWorkspaceToSeeImage();
    $(".lineColIndicatorArea").hide();
    tpen.screen.liveTool = "image";
    mouseZoom(img, event);
}

/**
* Creates a zoom on the image beneath the mouse.
*
* @param $img jQuery img element to zoom on
* @param event Event
*/
function mouseZoom($img, event){
    tpen.screen.isMagnifying = true;
    var imgURL = $img.find("img:first").attr("src");
    var page = $("#transcriptionTemplate");
    //collect information about the img
    var imgDims = new Array($img.offset().left, $img.offset().top, $img.width(), $img.height());
    //build the zoomed div
    var zoomSize = (page.height() / 3 < 120) ? 120 : page.height() / 3;
    var zoomPos = new Array(event.pageX, event.pageY);
    $("#zoomDiv").css({
        "box-shadow"    : "2px 2px 5px black,15px 15px " + zoomSize / 3 + "px rgba(230,255,255,.8) inset,-15px -15px " + zoomSize / 3 + "px rgba(0,0,15,.4) inset",
        "width"         : zoomSize,
        "height"        : zoomSize,
        "left"          : zoomPos[0] + 3,
        "top"           : zoomPos[1] + 3 - $(document).scrollTop() - $(".magnifyBtn").offset().top,
        "background-position" : "0px 0px",
        "background-size"     : imgDims[2] * tpen.screen.zoomMultiplier + "px",
        "background-image"    : "url('" + imgURL + "')"
    });
    $(document).on({
        mousemove: function(event){
            if (tpen.screen.liveTool !== "image" && tpen.screen.liveTool !== "compare") {
                $(document).off("mousemove");
                $("#zoomDiv").hide();
            }
            var mouseAt = new Array(event.pageX, event.pageY);
            var zoomPos = new Array(mouseAt[0] - zoomSize / 2, mouseAt[1] - zoomSize / 2);
            var imgPos = new Array((imgDims[0] - mouseAt[0]) * tpen.screen.zoomMultiplier + zoomSize / 2 - 3, (imgDims[1] - mouseAt[1]) * tpen.screen.zoomMultiplier + zoomSize / 2 - 3); //3px border adjustment
            $("#zoomDiv").css({
                "left"  : zoomPos[0],
                "top"   : zoomPos[1] - $(document).scrollTop(),
                "background-size"     : imgDims[2] * tpen.screen.zoomMultiplier + "px",
                "background-position" : imgPos[0] + "px " + imgPos[1] + "px"
            });
        }
    }, $img);
}

function removeTransition(){
    // TODO: objectify this
    $("#imgTop img").css("-webkit-transition", "");
    $("#imgTop img").css("-moz-transition", "");
    $("#imgTop img").css("-o-transition", "");
    $("#imgTop img").css("transition", "");
    $("#imgBottom img").css("-webkit-transition", "");
    $("#imgBottom img").css("-moz-transition", "");
    $("#imgBottom img").css("-o-transition", "");
    $("#imgBottom img").css("transition", "");
    $("#imgTop").css("-webkit-transition", "");
    $("#imgTop").css("-moz-transition", "");
    $("#imgTop").css("-o-transition", "");
    $("#imgTop").css("transition", "");
    $("#imgBottom").css("-webkit-transition", "");
    $("#imgBottom").css("-moz-transition", "");
    $("#imgBottom").css("-o-transition", "");
    $("#imgBottom").css("transition", "");
};

function restoreTransition(){
    // TODO: objectify this
    $("#imgTop img").css("-webkit-transition", "left .5s, top .5s, width .5s");
    $("#imgTop img").css("-moz-transition", "left .5s, top .5s, width .5s");
    $("#imgTop img").css("-o-transition", "left .5s, top .5s, width .5s");
    $("#imgTop img").css("transition", "left .5s, top .5s, width .5s");
    $("#imgBottom img").css("-webkit-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom img").css("-moz-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom img").css("-o-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom img").css("transition", "left .5s, top .5s, width .5s");
    $("#imgTop").css("-webkit-transition", "left .5s, top .5s, width .5s");
    $("#imgTop").css("-moz-transition", "left .5s, top .5s, width .5s");
    $("#imgTop").css("-o-transition", "left .5s, top .5s, width .5s");
    $("#imgTop").css("transition", "left .5s, top .5s, width .5s");
    $("#imgBottom").css("-webkit-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom").css("-moz-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom").css("-o-transition", "left .5s, top .5s, width .5s");
    $("#imgBottom").css("transition", "left .5s, top .5s, width .5s");
};

/**
* Sets screen for parsing tool use.
* Slides the workspace down and scales the top img
* to full height. From here, we need to load to interface
* for the selected tool.
*/
function hideWorkspaceForParsing(){
    $("#parsingBtn").css("box-shadow: none;");
    originalCanvasHeight = $("#transcriptionCanvas").height();
    originalCanvasWidth = $("#transcriptionCanvas").width();
    imgTopOriginalTop = $("#imgTop img").css("top");
    var pageJumpIcons = $("#pageJump").parent().children("i");
    pageJumpIcons[0].setAttribute('onclick', 'firstFolio("parsing");');
    pageJumpIcons[1].setAttribute('onclick', 'previousFolio("parsing");');
    pageJumpIcons[2].setAttribute('onclick', 'nextFolio("parsing");');
    pageJumpIcons[3].setAttribute('onclick', 'lastFolio("parsing");');
    $("#prevCanvas").attr("onclick", "");
    $("#nextCanvas").attr("onclick", "");
    $("#imgTop").addClass("fixingParsing");
    var topImg = $("#imgTop img");
    imgRatio = topImg.width() / topImg.height();
    var wrapWidth = imgRatio * $("#transcriptionTemplate").height();
    var PAGEWIDTH = $("#transcriptionTemplate").width();
    if (wrapWidth > PAGEWIDTH - 350){
        wrapWidth = PAGEWIDTH - 350;
    }
    $("#tools").children("[id$='Split']").hide();
    $("#parsingSplit")
    .css({
        "display": "inline-block",
        "height": window.innerHeight + "px"
    })
    .fadeIn();
    topImg.css({
        "top":"0px",
        "left":"0px",
        "height":"auto",
        "overflow":"auto"
    });
    $("#imgTop .lineColIndicatorArea").css({
        "top":"0px",
        "left":"0px"
    });
    $("#transcriptionTemplate").css("max-width", "57%");
    //the width and max-width here may need to be played with a bit.
    $("#transcriptionTemplate").resizable({
        disabled:false,
        minWidth: window.innerWidth / 2,
        maxWidth: window.innerWidth * .75,
        start: function(event, ui){
            originalRatio = $("#transcriptionCanvas").width() / $("#transcriptionCanvas").height();
        },
        resize: function(event, ui) {
            var width = ui.size.width;
            var height = 1 / originalRatio * width;
            $("#transcriptionCanvas").css("height", height + "px").css("width", width + "px");
            $(".lineColIndicatorArea").css("height", height + "px");
            var splitWidth = window.innerWidth - (width + 35) + "px";
            $(".split img").css("max-width", splitWidth);
            $(".split:visible").css("width", splitWidth);
        },
        stop: function(event, ui){
            //$(".lineColIndicator .lineColOnLine").css("line-height", $(this).height()+"px");
        }
    });
    $("#transWorkspace,#imgBottom").hide();
    $("#noLineWarning").hide();
    window.setTimeout(function(){
        $("#imgTop, #imgTop img").height($(window).innerHeight());
        $("#imgTop img").css("width", "auto");
        $("#imgTop").css("width", $("#imgTop img").width());
        $("#imgTop").css("height", $("#imgTop img").height());
        //At this point, transcription canvas is the original height and width
        //of the full page image.  We can use that for when we resume transcription.
        $("#transcriptionCanvas").css("height", $(window).innerHeight());
        $(".lineColIndicatorArea").css("height", $(window).innerHeight());
        $("#transcriptionCanvas").css("display", "block");
    }, 500);
    window.setTimeout(function(){
        //in here we can control what interface loads up.  writeLines
        //draws lines onto the new full size transcription image.
        $('.lineColIndicatorArea').hide();
        writeLines($("#imgTop img"));
    }, 1200);
}

/**
 * Overlays divs for each parsed line onto img indicated.
 * Divs receive different classes in different
 *
 * @param imgToParse img element lines will be represented over
 */
function writeLines(imgToParse){
    $(".line,.parsing,.adjustable,.parsingColumn").remove();
    //clear and old lines to put in updated ones
    var originalX = (imgToParse.width() / imgToParse.height()) * 1000;
    var setOfLines = [];
    var count = 0;
    $(".transcriptlet").each(function(index){
        count++;
        setOfLines[index] = makeOverlayDiv($(this), originalX, count);
    });
    imgToParse.parent().append($(setOfLines.join("")));
}

function makeOverlayDiv(thisLine, originalX, cnt){
    var Y = parseFloat(thisLine.attr("lineTop"));
    var X = parseFloat(thisLine.attr("lineLeft"));
    var H = parseFloat(thisLine.attr("lineHeight"));
    var W = parseFloat(thisLine.attr("lineWidth"));
    var newY = (Y);
    var newX = (X);
    var newH = (H);
    var newW = (W);
    var lineOverlay = "<div class='parsing' linenum='" + cnt + "' style='top:"
        + newY + "%;left:" + newX + "%;height:"
        + newH + "%;width:" + newW + "%;' lineserverid='"
        + thisLine.attr('lineserverid') + "'linetop='"
        + Y + "'lineleft='" + X + "'lineheight='"
        + H + "'linewidth='" + W + "'></div>";
    return lineOverlay;
}

/* Reset the interface to the full screen transcription view. */
function fullPage(){;
    if ($("#overlay").is(":visible")) {
        $("#overlay").click();
        return false;
    }
    $(".line, .parsing, .adjustable,.parsingColumn").remove();
    tpen.screen.isUnadjusted = tpen.screen.isFullscreen = true;
    if ($("#trascriptionTemplate").hasClass("ui-resizable")){
        $("#transcriptionTemplate").resizable('destroy');
    }
    $("#splitScreenTools").removeAttr("disabled");
    $("#splitScreenTools").find('option:eq(0)').prop("selected", true);
    $("#transcriptionCanvas").css("width", "100%");
    $("#transcriptionCanvas").css("height", "auto");
    $("#transcriptionTemplate").css("width", "100%");
    $("#transcriptionTemplate").css("max-width", "100%");
    $("#transcriptionTemplate").css("height", "auto");
    $("#transcriptionTemplate").css("display", "inline-block");
    $('.lineColIndicatorArea').show();
    $("#fullScreenBtn").fadeOut(250);
    tpen.screen.isZoomed = false;
    $(".split").hide();
    $(".split").css("width", "43%");
    restoreWorkspace();
    $("#splitScreenTools").show();
    var screenWidth = $(window).width();
    var adjustedHeightForFullscreen = (originalCanvasHeight2 / originalCanvasWidth2) * screenWidth;
    $("#transcriptionCanvas").css("height", adjustedHeightForFullscreen + "px");
    $(".lineColIndicatorArea").css("height", adjustedHeightForFullscreen + "px");
    $("#imgTop").hover(function(){
        var color = tpen.screen.colorThisTime.replace(".4", "1");
        $('.activeLine').css('box-shadow', '0px 0px 15px 8px ' + color);
    }, function(){
        $('.activeLine').css('box-shadow', '0px 0px 15px 8px ' + tpen.screen.colorThisTime);
    });
    $.each($(".lineColOnLine"), function(){
        $(this).css("line-height", $(this).height() + "px");
    });
    if (tpen.screen.focusItem[0] == null
        && tpen.screen.focusItem[1] == null){
        updatePresentation($("#transcriptlet_1"));
    }
}

function splitPage(event, tool) {
    tpen.screen.liveTool = tool;
    originalCanvasHeight = $("#transcriptionCanvas").height(); //make sure these are set correctly
    originalCanvasWidth = $("#transcriptionCanvas").width(); //make sure these are set correctly
    var ratio = originalCanvasWidth / originalCanvasHeight;
    $("#splitScreenTools").attr("disabled", "disabled");
    var imgBottomRatio = parseFloat($("#imgBottom img").css("top")) / originalCanvasHeight;
    var imgTopRatio = parseFloat($("#imgTop img").css("top")) / originalCanvasHeight;
    $("#transcriptionTemplate").css({
        "width"   :   "55%",
        "display" : "inline-table"
    });
    var newCanvasWidth = originalCanvasWidth2 * .55;
    var newCanvasHeight = 1 / ratio * newCanvasWidth;
    $("#transcriptionCanvas").css({
        "width"   :   newCanvasWidth + "px",
        "height"   :   newCanvasHeight + "px"
    });
    var newImgBtmTop = imgBottomRatio * newCanvasHeight;
    var newImgTopTop = imgTopRatio * newCanvasHeight;
    $(".lineColIndicatorArea").css("height", newCanvasHeight + "px");
    $("#imgBottom img").css("top", newImgBtmTop + "px");
    $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
    $("#imgTop img").css("top", newImgTopTop + "px");
    $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
    $.each($(".lineColOnLine"), function(){$(this).css("line-height", $(this).height() + "px"); });
    $("#transcriptionTemplate").resizable({
        disabled:false,
        minWidth: window.innerWidth / 2,
        maxWidth: window.innerWidth * .75,
        start: function(event, ui){
            originalRatio = $("#transcriptionCanvas").width() / $("#transcriptionCanvas").height();
        },
        resize: function(event, ui) {
            var width = ui.size.width;
            var height = 1 / originalRatio * width;
            $("#transcriptionCanvas").css("height", height + "px").css("width", width + "px");
            $(".lineColIndicatorArea").css("height", height + "px");
            var splitWidth = window.innerWidth - (width + 35) + "px";
            $(".split img").css("max-width", splitWidth);
            $(".split:visible").css("width", splitWidth);
            var newHeight1 = parseFloat($("#fullPageImg").height()) + parseFloat($("#fullPageSplit .toolLinks").height());
            var newHeight2 = parseFloat($(".compareImage").height()) + parseFloat($("#compareSplit .toolLinks").height());
            $('#fullPageSplit').css('height', newHeight1 + 'px');
            $('#compareSplit').css('height', newHeight2 + 'px');
        },
        stop: function(event, ui){
            $.each($(".lineColOnLine"), function(){
                var height = $(this).height() + "px";
                $(this).css("line-height", height);
            });
        }
    });
    $("#fullScreenBtn").fadeIn(250);
    //show/manipulate whichever split tool is activated.
    switch (tool){
        case "calligraphy":
            $("#calligraphySplit").css({
            "display": "inline-table"
        });
            break;
        case "scripts":
            $("#scriptsSplit").css({
                "display": "inline-table"
            });
            break;
        case "frenchdocs":
            $("#documentsSplit").css({
                "display": "inline-table",
            });
            break;
        case "conservation":
            $("#conservationSplit").css({
                "display": "inline-table"
            });
            break;
        case "conventions":
            $("#conventionsSplit").css({
                "display": "inline-table"
            });
            break;
        case "teachers":
            $("#teachersSplit").css({
                "display": "inline-table"
            });
            break;
        case "groupwork":
            $("#groupSplit").css({
                "display": "inline-table"
            });
            break;
        case "glossary":
            $("#glossarySplit").css({
                "display": "inline-table"
            });
            break;
        case "fInstitutions":
            $("#fInstitutionsSplit").css({
                "display": "inline-table"
            });
            break;
        case "other":
            $("#otherSplit").css({
                "display": "inline-table"
            });
            break;
        case "essay":
            $("#essaySplit").css({
                "display": "inline-table"
            });
            break;
        case "partialTrans":
            $("#partialTransSplit").css({
                "display": "inline-table"
            });
            break;
        case "abbreviations":
            $("#abbrevSplit").css({
                "display": "inline-table"
            });
            break;
        case "dictionary":
            $("#dictionarySplit").css({
                "display": "inline-table"
            });
            break;
        case "preview":
            forceOrderPreview();
            break;
        case "history":
            $("#historySplit").css({
                "display": "inline-table"
            });
            break;
        case "fullPage":
            $("#fullPageSplit").css({
                "display": "block"
            });
            break;
        case "compare":
            $("#compareSplit").css({
                "display": "block"
            });
            //When comparing, you need to be able to see the whole image, so I restrict it to window height.
            //To allow it to continue to grow, comment out the code below.
            $(".compareImage").css({
                "max-height":window.innerHeight + "px",
                "max-width":$("#compareSplit").width() + "px"
            });
            populateCompareSplit(1);
            break;
        case "facing":
            $("#facingSplit").css("display", "block");
            break;
        case "maps":
            $("#mapsSplit").css("display", "inline-table");
            break;
        case "start":
            $("#startSplit").css("display", "inline-table");
            default:
            //This is a user added iframe tool.  tool is toolID= attribute of the tool div to show.
            $('div[toolName="' + tool + '"]').css("display", "inline-table");
    }
    $(".split:visible").find('img').css({
        'max-height': window.innherHeight + 350 + "px",
        'max-width' : $(".split:visible").width() + "px"
    });
    var pageJumpIcons = $("#pageJump").parent().children("i");
    pageJumpIcons[0].setAttribute('onclick', 'firstFolio("parsing");');
    pageJumpIcons[1].setAttribute('onclick', 'previousFolio("parsing");');
    pageJumpIcons[2].setAttribute('onclick', 'nextFolio("parsing");');
    pageJumpIcons[3].setAttribute('onclick', 'lastFolio("parsing");');
    $("#prevCanvas").attr("onclick", "");
    $("#nextCanvas").attr("onclick", "");
}

function forceOrderPreview(){
    var ordered = [];
    var length = $(".previewPage").length;
    for (var i = 0; i < length; i++){
        var thisOne = $(".previewPage[order='" + i + "']");
        ordered.push(thisOne);
        if (i === length - 1){
            $("#previewDiv").empty();
            $("#previewDiv").append(ordered);
        }
    }
    $("#previewSplit").css({
        "display": "inline-table"
    });
}

function populateCompareSplit(folioIndex){
    var canvasIndex = folioIndex - 1;
    var compareSrc = tpen.manifest.sequences[0].canvases[canvasIndex].images[0].resource["@id"];
    var currentCompareSrc = $(".compareImage").attr("src");
    if (currentCompareSrc !== compareSrc) $(".compareImage").attr("src", compareSrc);
}

/*
 * Go through all of the parsing lines and put them into columns;
 * @see linesToColumns()
 * Global Arrray: gatheredColumns
 *
 */
function gatherColumns(startIndex){
    var colX, colY, colW, colH;
    var lastColumnLine = - 1;
    var linesInColumn = - 1;
    var hasTranscription = false;
    if ($(".parsing")[startIndex + 1]){
        var line = $(".parsing")[startIndex + 1];
        colX = parseFloat($(line).attr("lineleft"));
        colY = parseFloat($(line).attr("linetop"));
        colW = parseFloat($(line).attr("linewidth"));
        var $lastLine = $(".parsing[lineleft='" + colX + "']:last");
        colH = parseFloat($lastLine.attr("linetop")) - colY + parseFloat($lastLine.attr("lineheight"));
        var lastLineIndex = $(".parsing").index($lastLine);
        tpen.screen.gatheredColumns.push([colX, colY, colW, colH, $(line).attr("lineserverid"), $lastLine.attr("lineserverid"), true]);
        gatherColumns(lastLineIndex);
    }
}

function removeColumn(column, destroy){
    if (!destroy){
        if (column.attr("hastranscription") === "true"){
            var cfrm = confirm("This column contains transcription data that will be lost.\n\nContinue?");
            if (!cfrm) return false;
        }
    }
    var colX = column.attr("lineleft");
    // collect lines from column
    var lines = $(".parsing[lineleft='" + colX + "']");
    var lineLen = lines.length;
    var lineCnt = 0;
    lines.addClass("deletable");
    removeColumnTranscriptlets(lines);
    column.remove();
}

function destroyPage(){
    nextColumnToRemove = $(".parsingColumn:first");
    var colX = nextColumnToRemove.attr("lineleft");
    var lines = $(".parsing[lineleft='" + colX + "']");
    if (nextColumnToRemove.length > 0) {
        removeColumnTranscriptlets(lines, true);
    }
    else {
        cleanupTranscriptlets(true);
    }
}

/* Make parsing interface turn the lines in the view into columns */
function linesToColumns(){
//update lines in case of changes
    tpen.screen.gatheredColumns = []; //The array built by gatherColumns()
    $(".parsingColumn").remove();
    if ($(".parsing").size() === 0) return false;
    //loop through lines to find column dimensions
    var columnParameters = new Array(); // x,y,w,h,startID,endID
    var i = 0;
    var colX, colY, colW, colH;
    var lastColumnLine = - 1;
    var linesInColumn = - 1;
    gatherColumns( - 1); //Gets all columns into an array.
    //build columns
    var columns = [];
    for (j = 0; j < tpen.screen.gatheredColumns.length; j++){
        var parseImg = document.getElementById("imgTop").getElementsByTagName("img");
        var scaledX = tpen.screen.gatheredColumns[j][0];
        var scaledY = tpen.screen.gatheredColumns[j][1];
        var scaledW = tpen.screen.gatheredColumns[j][2];
        var scaledH = tpen.screen.gatheredColumns[j][3];
    //            // recognize, alert, and adjust to out of bounds columns
        if (scaledX + scaledW > 100){
        // exceeded the right boundary of the image
            if (scaledX > 98){
                scaledX = 98;
                scaledW = 2;
            } else {
                scaledW = 100 - scaledX - 1;
            }
        }
        if (scaledX < 0){
            // exceeded the left boundary of the image
            scaledW += scaledX;
            scaledX = 0;
        }
        if (scaledY + scaledH > 100){
            // exceeded the bottom boundary of the image
            if (scaledY > 98){
                scaledY = 98;
                scaledH = 2;
            } else {
                scaledH = 100 - scaledY - 1;
            }
        }
        if (scaledY < 0){
            // exceeded the top boundary of the image
            scaledH += scaledY;
            scaledY = 0;
        }
        var startID = $(".parsing[lineleft='" + gatheredColumns[j][0] + "']:first").attr("lineserverid");
        var endID = $(".parsing[lineleft='" + gatheredColumns[j][0] + "']:last").attr("lineserverid");
        columns.push("<div class='parsingColumn' lineleft='", gatheredColumns[j][0], "'",
            " linetop='", gatheredColumns[j][1], "'",
            " linewidth='", gatheredColumns[j][2], "'",
            " lineheight='", gatheredColumns[j][3], "'",
            " hastranscription='", gatheredColumns[j][6] == true, "'",
            " startid='", startID, "'",
            " endid='", endID, "'",
            " style='top:", scaledY, "%;left:", scaledX, "%;width:", scaledW, "%;height:", scaledH, "%;'>",
            "</div>");
    }
    //attach columns
    $(parseImg).before(columns.join(""));
    // avoid events on .lines
    $('#imgTop').find('.parsing').css({
        'z-index': '-10'
    });
    $(".parsingColumn")
    .mouseenter(function(){
        var lineInfo;
        lineInfo = $("#transcription" + ($(this).index(".parsing") + 1)).val();
        $("#lineInfo").empty()
        .text(lineInfo)
        .append("<div>" + $("#t" + ($(this).index(".line") + 1)).find(".counter").text() + "</div>")
        .show();
        if (!tpen.screen.isMagnifying){
            $(this).addClass("jumpLine");
        }
    })
    .mouseleave(function(){
        $(".parsing").removeClass("jumpLine");
        $("#lineInfo").hide();
    })
    .click(function(event){
    });
}

/**
 * Allows for column adjustment in the parsing interface.
 */
function adjustColumn(event){
    var thisColumnID = new Array(2);
    var thisColumn;
    var originalX = 1;
    var originalY = 1;
    var originalW = 1;
    var originalH = 1;
    var adjustment = "";
    var column = undefined;
    var originalPercentW;
    var originalPercentX;
    $.each($(".parsingColumn"), function(){
        if ($(this).hasClass("ui-resizable")){
            $(this).resizable("destroy");
        }
    });
    $(".parsingColumn").resizable({
        handles     : "n,s,w,e",
        containment : 'parent',
        start       : function(event, ui){
            $("#progress").html("Adjusting Columns - unsaved").fadeIn();
            $("#columnResizing").show();
            $("#sidebar").fadeIn();
            thisColumn = $(".ui-resizable-resizing");
            thisColumnID = [thisColumn.attr("startid"), thisColumn.attr("endid")];
            adjustment = "new";
            originalPercentW = parseFloat($(this).attr("linewidth"));
            originalPercentX = parseFloat($(this).attr("lineleft"));
        },
        resize      : function(event, ui){
            if (adjustment === "new"){
                var originalX = ui.originalPosition.left;
                var originalY = ui.originalPosition.top;
                var originalW = ui.originalSize.width;
                var originalH = ui.originalSize.height;
                var newX = ui.position.left;
                var newY = ui.position.top;
                var newW = ui.size.width;
                var newH = ui.size.height;
                var offsetForBtm = $(event.target).position().top;
                if (Math.abs(originalW - newW) > 5) adjustment = "right";
                if (Math.abs(originalH - newH) > 5) adjustment = "bottom";
                if (Math.abs(originalX - newX) > 5) adjustment = "left"; // a left change would affect w and x, order matters
                if (Math.abs(originalY - newY) > 5) adjustment = "top"; // a top change would affect h and y, order matters
                offsetForBtm = (offsetForBtm / $("#imgTop img").height()) * 100;
                newH = (newH / $("#imgTop img").height()) * 100;
                var actualBottom = newH + offsetForBtm;
                $("#progress").html("Adjusting " + adjustment + " - unsaved");
            }
        },
        stop        : function(event, ui){
            $("#progress").html("Column Resized - Saving...");
            var parseRatio = $("#imgTop img").width() / $("#imgTop img").height();
            var originalX = ui.originalPosition.left;
            var originalY = ui.originalPosition.top;
            var originalW = ui.originalSize.width;
            var originalH = ui.originalSize.height;
            var newX = ui.position.left;
            var newY = ui.position.top;
            var newW = ui.size.width;
            var newH = ui.size.height;
            var oldHeight, oldTop, oldLeft, newWidth, newLeft;
            //THESE ORIGINAL AND NEW VALUES ARE EVALUATED AS PIXELS, NOT PERCENTAGES
            if (adjustment === "top") {
                newY = (newY / $("#imgTop img").height()) * 100;
                originalY = (originalY / $("#imgTop img").height()) * 100;
                //save a new height for the top line;
                var startLine = $(".parsing[lineserverid='" + thisColumnID[0] + "']");
                oldHeight = parseFloat(startLine.attr("lineheight"));
                oldTop = parseFloat(startLine.attr("linetop"));
                //This should be resized right now.  If it is a good resize, the lineheight will be > 0
                startLine.attr({
                    "linetop"    : newY,
                    "lineheight" : oldHeight + oldTop - newY
                });
                startLine.css({
                    "top"    : newY + "%",
                    "height" : oldHeight + oldTop - newY + "%"
                });
                if (parseFloat(startLine.attr("lineheight")) < 0){
                    // top of the column is below the bottom of its top line
                    var newTopLine = startLine;
                    do {
                        newTopLine = startLine.next('.parsing');
                        removeLine(startLine, true);
                        removeTranscriptlet(startLine.attr("lineserverid"), startLine.attr("lineserverid"), true);
                        startLine = newTopLine;
                        oldHeight = parseFloat(startLine.attr("lineheight"));
                        oldTop = parseFloat(startLine.attr("linetop"));
                    } while (parseFloat(startLine.attr("linetop")) + parseFloat(startLine.attr("lineheight")) < newY);
                    //Got through all the ones that needed removing, now I am on the one that needs resizing.
                    startLine.attr({
                        "linetop"    : newY,
                        "lineheight" : oldHeight + oldTop - newY
                    });
                    startLine.css({
                        "top"    : newY + "%",
                        "height" : oldHeight + oldTop - newY + "%"
                    });
                    thisColumn.attr("startid", startLine.attr("lineserverid"));
                }
                $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
            }
        else if (adjustment === "bottom"){
            //technically, we want to track the bottom.  The bottom if the height + top offset
            var offsetForBtm = $(event.target).position().top;
            offsetForBtm = (offsetForBtm / $("#imgTop img").height()) * 100;
            newH = (newH / $("#imgTop img").height()) * 100;
            var actualBottom = newH + offsetForBtm;
            //save a new height for the bottom line
            var endLine = $(".parsing[lineserverid='" + thisColumnID[1] + "']");
            oldHeight = parseFloat(endLine.attr("lineheight"));
            oldTop = parseFloat(endLine.attr("linetop"));
            endLine.attr({
                "lineheight" : oldHeight + (newH - originalH)
            });
            endLine.css({
                "height" : oldHeight + (newH - originalH) + "%"
            });
            if (parseFloat(endLine.attr("linetop")) > actualBottom){
                //the bottom line isnt large enough to account for the change,
                // delete lines until we get to a  line that,
                // when combined with the deleted lines
                //can account for the requested change.
                do {
                oldHeight = parseFloat(endLine.attr("lineheight"));
                    oldTop = parseFloat(endLine.attr("linetop"));
                    var nextline = endLine.prev(".parsing");
                    endLine.remove();
                    removeLine(endLine, true);
                    removeTranscriptlet(endLine.attr("lineserverid"), endLine.attr("lineserverid"), true);
                    endLine = nextline;
                } while (parseFloat(endLine.attr("linetop")) > actualBottom);
                var currentLineTop = parseFloat(endLine.attr("linetop"));
                endLine.attr({
                    "lineheight" : actualBottom - currentLineTop
                });
                endLine.css({
                    "height" : actualBottom - currentLineTop + "%"
                });
                thisColumn.attr("endid", endLine.attr("lineserverid"));
            }
            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
        }
        else if (adjustment === "left"){
            //save a new left,width for all these lines
            var leftGuide = $(".parsing[lineserverid='" + thisColumnID[0] + "']");
            oldLeft = parseFloat(leftGuide.attr("lineleft"));
            var ratio1 = originalPercentW / originalW;
            var ratio2 = originalPercentX / originalX;
            newWidth = newW * ratio1;
            newLeft = newX * ratio2;
            $(".parsing[lineleft='" + oldLeft + "']").each(function(){
                $(this).attr({
                    "lineleft" : newLeft,
                    "linewidth": newWidth
                });
                    $(this).css({
                    "left" : newLeft + "%",
                    "width": newWidth + "%"
                });
            });
            updateLinesInColumn(thisColumnID);
            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
            cleanupTranscriptlets(true);
        }
        else if (adjustment === "right"){
            //save a new width for all these lines
            var rightGuide = $(".parsing[lineserverid='" + thisColumnID[0] + "']");
            oldLeft = parseFloat(rightGuide.attr("lineleft"));
            var ratio = originalPercentW / originalW;
            newWidth = newW * ratio; //new percent width
            $(".parsing[lineleft='" + oldLeft + "']").each(function(){
                $(this).attr({
                    "linewidth": newWidth
                });
                $(this).css({
                    "width": newWidth + "%"
                });
            });
            updateLinesInColumn(thisColumnID);
            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
            cleanupTranscriptlets(true);
        } else {
            $("#progress").html("No changes made.").delay(3000).fadeOut(1000);
        }
        $("#lineResizing").delay(3000).fadeOut(1000);
        adjustment = "";
        }
    });
}

/**
 * Determines action based on transcription line clicked and tool in use.
 * Alerts 'unknown click' if all fails. Calls lineChange(e,event) for
 * parsing tool. Jumps to transcriptlet for full page tool.
 */
function clickedLine(e, event) {
    //Stop ability to make a new line until the update from this process is complete.
    if ($(e).hasClass("parsing")){
        if ($("#addLines").hasClass('active') || $("#removeLines").hasClass('active')){
        $("#parsingCover").show();
            lineChange(e, event);
        }
    }
    else {
    }
}

function reparseColumns(){
    $.each($('.parsingColumn'), function(){
        var colX = $(this).attr("lineleft");
        // collect lines from column
        var lines = $(".parsing[lineleft='" + colX + "']");
        lines.addClass("deletable");
        var linesSize = lines.size();
        // delete from the end, alerting for any deleted data
        for (var i = linesSize; i > 0; i--){
            removeLine(lines[i], true);
        }
    });
}

function insertTag(tagName, fullTag){
    if (tagName.lastIndexOf("/") === (tagName.length - 1)) {
        //transform self-closing tags
        var slashIndex = tagName.length;
        fullTag = fullTag.slice(0, slashIndex) + fullTag.slice(slashIndex + 1, - 1) + " />";
    }
    // Check for wrapped tag
    if (!addchar(escape(fullTag), escape(tagName))) {
        closeTag(escape(tagName), escape(fullTag));
    }
}

function closeTag(tagName, fullTag){
    // Do not create for self-closing tags
    if (tagName.lastIndexOf("/") === (tagName.length - 1)) return false;
    var tagLineID = tpen.screen.focusItem[1].attr("lineserverid");
    var closeTag = document.createElement("div");
    var tagID;
    $.get("tagTracker", {
        addTag      : true,
        tag         : tagName,
        projectID   : tpen.project.projectID,
        line        : tagLineID
        }, function(data){
            tagID = data;
            $(closeTag).attr({
                "class"     :   "tags ui-corner-all right ui-state-error",
                "title"     :   unescape(fullTag),
                "data-line" :   tagLineID,
                //"data-folio":   folio,
                "data-tagID":   tagID
            }).text("/" + tagName);
            tpen.screen.focusItem[1].children(".xmlClosingTags").append(closeTag);
        }
    );
}

function addchar(theChar, closingTag) {
    var closeTag = (closingTag === undefined) ? "" : closingTag;
    var e = tpen.screen.focusItem[1].find('textarea')[0];
    if (e !== null) {
        return setCursorPosition(e, insertAtCursor(e, theChar, closeTag));
    }
    return false;
}

function setCursorPosition(e, position) {
    var pos = position;
    var wrapped = false;
    if (pos.toString().indexOf("wrapped") === 0) {
        pos = parseInt(pos.substr(7));
        wrapped = true;
    }
    e.focus();
    if (e.setSelectionRange) {
        e.setSelectionRange(pos, pos);
    }
    else if (e.createTextRange) {
        e = e.createTextRange();
        e.collapse(true);
        e.moveEnd('character', pos);
        e.moveStart('character', pos);
        e.select();
    }
    return wrapped;
}

function insertAtCursor (myField, myValue, closingTag) {
    var closeTag = (closingTag === undefined) ? "" : unescape(closingTag);
    //IE support
    if (document.selection) {
        myField.focus();
        sel = document.selection.createRange();
        sel.text = unescape(myValue);
        //Preview.updateLine(myField);
        return sel + unescape(myValue).length;
    }
    //MOZILLA/NETSCAPE support
    else if (myField.selectionStart || myField.selectionStart == '0') {
        var startPos = myField.selectionStart;
        var endPos = myField.selectionEnd;
        if (startPos != endPos) {
            // something is selected, wrap it instead
            var toWrap = myField.value.substring(startPos, endPos);
            myField.value = myField.value.substring(0, startPos)
            + unescape(myValue)
            + toWrap
            + "</" + closeTag + ">"
            + myField.value.substring(endPos, myField.value.length);
            myField.focus();
            // Preview.updateLine(myField);
            var insertLength = startPos + unescape(myValue).length +
            toWrap.length + 3 + closeTag.length;
            return "wrapped" + insertLength;
        } else {
            myField.value = myField.value.substring(0, startPos)
            + unescape(myValue)
            + myField.value.substring(startPos, myField.value.length);
            myField.focus();
            return startPos + unescape(myValue).length;
        }
    } else {
        myField.value += unescape(myValue);
        myField.focus();
        return myField.length;
    }
}

function toggleCharacters(){
    if ($("#charactersPopin .character:first").is(":visible")){
        $("#charactersPopin .character").fadeOut(400);
    }
    else{
        $("#charactersPopin .character").fadeIn(400).css("display", "block");
    }
}

function toggleTags(){
    if ($("#xmlTagPopin .lookLikeButtons:first").is(":visible")){
        $("#xmlTagPopin .lookLikeButtons").fadeOut(400);
    }
    else{
        $("#xmlTagPopin .lookLikeButtons").fadeIn(400).css("display", "block");
    }
}

function togglePageJump(){
    if ($("#pageJump .folioJump:first").is(":visible")){
        $("#pageJump .folioJump").fadeOut(400);
    }
    else{
        $("#pageJump .folioJump").fadeIn(400).css("display", "block");
    }
}

/* Change the page to the specified page from the drop down selection. */
function pageJump(page, parsing){
    var folioNum = parseInt(page); //1,2,3...
    var canvasToJumpTo = folioNum - 1; //0,1,2...
    if (tpen.screen.currentFolio !== folioNum && canvasToJumpTo >= 0){ //make sure the default option was not selected and that we are not jumping to the current folio
        tpen.screen.currentFolio = folioNum;
        if (parsing === "parsing"){
            $(".pageTurnCover").show();
            fullPage();
            tpen.screen.focusItem = [null, null];
            loadTranscriptionCanvas(tpen.manifest.sequences[0].canvases[canvasToJumpTo], parsing);
            setTimeout(function(){
                hideWorkspaceForParsing();
                $(".pageTurnCover").fadeOut(1500);
            }, 800);
        }
        else {
            tpen.screen.currentFolio = folioNum;
            tpen.screen.focusItem = [null, null];
            loadTranscriptionCanvas(tpen.manifest.sequences[0].canvases[canvasToJumpTo], "");
        }
    }
    else{
    }
}

function compareJump(folio){
    populateCompareSplit(folio);
}

/* Change color of lines on screen */
function markerColors(){
/*
 * This function allows the user to go through annotation colors and decide what color the outlined lines are.
 * colorThisTime
 */
    var tempColorList = ["rgba(153,255,0,.4)", "rgba(0,255,204,.4)", "rgba(51,0,204,.4)", "rgba(204,255,0,.4)", "rgba(0,0,0,.4)", "rgba(255,255,255,.4)", "rgba(255,0,0,.4)"];
    if (tpen.screen.colorList.length == 0){
        tpen.screen.colorList = tempColorList;
    }
    tpen.screen.colorThisTime = tpen.screen.colorList[Math.floor(Math.random() * tpen.screen.colorList.length)];
    tpen.screen.colorList.splice(tpen.screen.colorList.indexOf(tpen.screen.colorThisTime), 1);
    var oneToChange = tpen.screen.colorThisTime.lastIndexOf(")") - 2;
    var borderColor = tpen.screen.colorThisTime.substr(0, oneToChange) + '.2' + tpen.screen.colorThisTime.substr(oneToChange + 1);
    var lineColor = tpen.screen.colorThisTime.replace(".4", "1"); //make this color opacity 100
    $('.lineColIndicator').css('border', '1px solid ' + lineColor);
    $('.lineColOnLine').css({'border-left':'1px solid ' + borderColor, 'color':lineColor});
    $('.activeLine').css('box-shadow', '0px 0px 15px 8px ' + tpen.screen.colorThisTime); //keep this color opacity .4 until imgTop is hovered.
}

/* Toggle the line/column indicators in the transcription interface. (A1, A2...) */
function toggleLineMarkers(){
    if ($('.lineColIndicator:first').is(":visible")
        && $('.lineColIndicator:eq(1)').is(":visible")){ //see if a pair of lines are visible just in case you checked the active line first.
        $('.lineColIndicator').hide();
        $(".activeLine").show().addClass("linesHidden");
    }
    else {
        $('.lineColIndicator').show();
        $(".lineColIndicator").removeClass("linesHidden");
        $.each($(".lineColOnLine"), function(){$(this).css("line-height", $(this).height() + "px"); });
    }
}

/* Toggle the drawn lines in the transcription interface. */
function toggleLineCol(){
    if ($('.lineColOnLine:first').is(":visible")){
        $('.lineColOnLine').hide();
    }
    else{
        $('.lineColOnLine').show();
        $.each($(".lineColOnLine"), function(){$(this).css("line-height", $(this).height() + "px"); });
    }
}

function updateLinesInColumn(column){
    var startLineID = column[0];
    var endLineID = column[1];
    var startLine = $(".parsing[lineserverid='" + startLineID + "']"); //Get the start line
    var nextLine = startLine.next(".parsing"); //Get the next line (potentially)
    var linesToUpdate = [];
    linesToUpdate.push(startLine); //push first line
    while (nextLine.length > 0 && nextLine.attr("lineserverid") !== endLineID){ //if there is a next line and its not the last line in the column...
        linesToUpdate.push(nextLine);
        nextLine = nextLine.next(".parsing");
    }
    if (startLineID !== endLineID){ //push the last line, so long as it was also not the first line
        linesToUpdate.push($(".parsing[lineserverid='" + endLineID + "']")); //push last line
    }
    columnUpdate(linesToUpdate);
}

/* Bulk update for lines in a column. */
function columnUpdate(linesInColumn){
    var onCanvas = $("#transcriptionCanvas").attr("canvasid");
    var currentFolio = parseInt(tpen.screen.currentFolio);
    var currentAnnoListID = annoLists[currentFolio - 1];
    var currentAnnoListResources = [];
    var lineTop, lineLeft, lineWidth, lineHeight = 0;
    var ratio = originalCanvasWidth2 / originalCanvasHeight2;
    var annosURL = "getAnno";
    var properties = {"@id": currentAnnoListID};
    var paramOBJ = {"content": JSON.stringify(properties)};
    $.post(annosURL, paramOBJ, function(annoLists){
        annoLists = JSON.parse(annoLists);
        var currentAnnoList;
        $.each(annoLists, function(){
            if (this.proj === "master"){
                currentAnnoListResources = this.resources;
            }
            if (this.proj !== undefined && this.proj !== "" && this.proj == theProjectID){
            //These are the lines we want to draw because the projectID matches.  Overwrite master if necessary.
                currentAnnoListResources = this.resources;
                return false;
            }
        });
        //Go over each line from the column resize.
        $.each(linesInColumn, function(){
            var line = $(this);
            lineTop = parseFloat(line.attr("linetop")) * 10;
            lineLeft = parseFloat(line.attr("lineleft")) * (10 * ratio);
            lineWidth = parseFloat(line.attr("linewidth")) * (10 * ratio);
            lineHeight = parseFloat(line.attr("lineheight")) * 10;
            //round up.
            lineTop = Math.round(lineTop, 0);
            lineLeft = Math.round(lineLeft, 0);
            lineWidth = Math.round(lineWidth, 0);
            lineHeight = Math.round(lineHeight, 0);
            line.css("width", line.attr("linewidth") + "%");
            var lineString = lineLeft + "," + lineTop + "," + lineWidth + "," + lineHeight;
            var currentLineServerID = line.attr('lineserverid');
            var currentLineText = $(".transcriptlet[lineserverid='" + currentLineServerID + "']").find("textarea").val();
            var dbLine = {
                "@id" : currentLineServerID,
                "@type" : "oa:Annotation",
                "motivation" : "sc:painting",
                "resource" : {
                    "@type" : "cnt:ContentAsText",
                    "cnt:chars" : currentLineText
                },
                "on" : onCanvas + "#xywh=" + lineString,
                "otherContent" : [],
                "forProject": tpen.manifest['@id']
            };
            var index = - 1;
            //find the line in the anno list resources and replace its position with the new line resource.
            $.each(currentAnnoListResources, function(){
                index++;
                if (this["@id"] == currentLineServerID){
                    currentAnnoListResources[index] = dbLine;
                    return false;
                }
            });
        });
        //Now that all the resources are edited, update the list.
        var url = "updateAnnoList";
        var paramObj = {
            "@id":currentAnnoListID,
            "resources": currentAnnoListResources
        };
        var params = {"content":JSON.stringify(paramObj)};
        $.post(url, params, function(data){
            currentFolio = parseInt(currentFolio);
            annoLists[currentFolio - 1] = currentAnnoListID;
        });
    });
}

    function getList(canvas){
        var lists = canvas.otherContent;
        var annos = [];
        $.each(lists,function(){
            var l = this;
            if (this.resources) {
                $.each(this.resources,function(){
                    if(this.on.startsWith(canvas['@id'])){
                        annos.push(this);
                        tpen.screen.currentAnnoListID = l['@id'];
                    }
                });
            }
        });
        return annos;
    };

/* Update line information for a particular line. */
function updateLine(line, cleanup){
    var onCanvas = $("#transcriptionCanvas").attr("canvasid");
    var currentFolio = parseInt(tpen.screen.currentFolio);
    var currentAnnoListID = tpen.screen.currentAnnoListID;
    var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio]);
    var lineTop, lineLeft, lineWidth, lineHeight = 0;
    var ratio = originalCanvasWidth2 / originalCanvasHeight2;
    lineTop = parseFloat(line.attr("linetop")) * 10;
    lineLeft = parseFloat(line.attr("lineleft")) * (10 * ratio);
    lineWidth = parseFloat(line.attr("linewidth")) * (10 * ratio);
    lineHeight = parseFloat(line.attr("lineheight")) * 10;
    //round up.
    lineTop = Math.round(lineTop, 0);
    lineLeft = Math.round(lineLeft, 0);
    lineWidth = Math.round(lineWidth, 0);
    lineHeight = Math.round(lineHeight, 0);
    var lineString = lineLeft + "," + lineTop + "," + lineWidth + "," + lineHeight;
    var currentLineServerID = line.attr('lineserverid');
    var currentLineText = $(".transcriptlet[lineserverid='" + currentLineServerID + "']").find("textarea").val();
    var dbLine = {
        "@id" : currentLineServerID,
        "@type" : "oa:Annotation",
        "motivation" : "oad:transcribing",
        "resource" : {
            "@type" : "cnt:ContentAsText",
            "cnt:chars" : currentLineText
        },
        "on" : onCanvas + "#xywh=" + lineString,
        "otherContent" : [],
        "forProject": tpen.manifest['@id']
    };
    if (currentAnnoListID !== "noList" && currentAnnoListID !== "empty"){
        // if its IIIF, we need to update the list
        var annosURL = "getAnno";
        var properties = {"@id": currentAnnoListID};
        var paramOBJ = {"content": JSON.stringify(properties)};
        $.post(annosURL, paramOBJ, function(annoList){
            annoList = JSON.parse(annoList);
            var annoListID = currentAnnoListID;
            currentAnnoList = annoList[0];
            $.each(currentAnnoList.resources, function(index){
                if (this["@id"] == currentLineServerID){
                    currentAnnoList.resources[index] = dbLine;
                    var url = "updateAnnoList";
                    var paramObj = {"@id":annoListID, "resources": currentAnnoList.resources};
                    var params = {"content":JSON.stringify(paramObj)};
                    $.post(url, params, function(data){
                    currentFolio = parseInt(currentFolio);
                        $("#parsingCover").hide();
                    });
                }
            });
        });
    }
    else if (currentAnnoList === "empty"){
        //cannot update an empty list
    }
    else if (currentAnnoList === "noList"){ //If it is classic T-PEN, we need to update canvas resources
        currentFolio = parseInt(currentFolio);
        $.each(tpen.manifest.sequences[0].canvases[currentFolio - 1].resources, function(){
        index++;
            if (this["@id"] == currentLineServerID){
                tpen.manifest.sequences[0].canvases[currentFolio - 1].resources[index] = dbLine;
            }
        });
        //Should we do an update here to support old data?
    }
    if (cleanup !== "no") cleanupTranscriptlets(true);
}

function saveNewLine(lineBefore, newLine){
    var theURL = window.location.href;
    var projID = - 1;
    if (theURL.indexOf("projectID") === - 1){
        projID = theProjectID;
    }
    else{
        projID = theURL.substring(theURL.indexOf("projectID=") + 10);
    }
    var beforeIndex = - 1;
    if (lineBefore !== undefined && lineBefore !== null){
        beforeIndex = parseInt(lineBefore.attr("linenum"));
    }
    var onCanvas = $("#transcriptionCanvas").attr("canvasid");
    var newLineTop, newLineLeft, newLineWidth, newLineHeight = 0;
    var ratio = originalCanvasWidth2 / originalCanvasHeight2;
    newLineTop = parseFloat(newLine.attr("linetop"));
    newLineLeft = parseFloat(newLine.attr("lineleft"));
    newLineWidth = parseFloat(newLine.attr("linewidth"));
    newLineHeight = parseFloat(newLine.attr("lineheight"));
    newLineTop = newLineTop * 10;
    newLineLeft = newLineLeft * (10 * ratio);
    newLineWidth = newLineWidth * (10 * ratio);
    newLineHeight = newLineHeight * 10;
    //round up.
    newLineTop = Math.round(newLineTop, 0);
    newLineLeft = Math.round(newLineLeft, 0);
    newLineWidth = Math.round(newLineWidth, 0);
    newLineHeight = Math.round(newLineHeight, 0);
    var lineString = onCanvas + "#xywh=" + newLineLeft + "," + newLineTop + "," + newLineWidth + "," + newLineHeight;
    var currentLineText = "";
    var dbLine = {
        "@id" : "",
        "@type" : "oa:Annotation",
        "motivation" : "oad:transcribing",
        "resource" : {
            "@type" : "cnt:ContentAsText",
            "cnt:chars" : currentLineText
        },
        "on" : lineString,
        "otherContent":[],
        "forProject": tpen.manifest['@id']
    };
    var url = "saveNewTransLineServlet";
    var paramOBJ = dbLine;
    var params = {"content" : JSON.stringify(paramOBJ)};
    if (onCanvas !== undefined && onCanvas !== ""){
        $.post(url, params, function(data){
            data = JSON.parse(data);
            dbLine["@id"] = data["@id"];
            newLine.attr("lineserverid", data["@id"]);
            $("div[newcol='" + true + "']").attr({
                "startid" : dbLine["@id"],
                "endid" : dbLine["@id"],
                "newcol":false
            });
            var currentFolio = tpen.screen.currentFolio;
            var currentAnnoList = getList(tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio]);
            if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){
                // if it IIIF, we need to update the list
                var annosURL = "getAnno";
                var properties = {"@id": currentAnnoList};
                var paramOBJ = {"content": JSON.stringify(properties)};
                $.post(annosURL, paramOBJ, function(annoList){
                    annoList = JSON.parse(annoList);
                    currentAnnoList = annoList[0];
                    if (beforeIndex == - 1){
                        $(".newColumn").attr({
                            "lineserverid" : dbLine["@id"],
                            "linenum" : $(".parsing").length
                        }).removeClass("newColumn");
                        currentAnnoList.resources.push(dbLine);
                    }
                    else {
                        currentAnnoList.resources.splice(beforeIndex + 1, 0, dbLine);
                    }
                    currentFolio = parseInt(currentFolio);
                    tpen.manifest.sequences[0].canvases[currentFolio - 1].otherContent[0] = annoList;
                    //Write back to db to update list
                    var url1 = "updateAnnoList";
                    var paramObj1 = {"@id":tpen.screen.currentAnnoListID, "resources": currentAnnoList.resources};
                    var params1 = {"content":JSON.stringify(paramObj1)};
                    $.post(url1, params1, function(data){
                        if (lineBefore !== undefined && lineBefore !== null){
                            //This is the good case.  We called split line and saved
                            //the new line, now we need to update the other one.
                            updateLine(lineBefore);
                        }
                        else{
                        }
                            $("#parsingCover").hide();
                    });
                });
            }
            else if (currentAnnoList == "empty"){
                //This means we know no AnnotationList was on the store for this canvas,
                //and otherContent stored with the canvas object did not have the list.
                // Make a new one in this case.
                var newAnnoList = {
                    "@type" : "sc:AnnotationList",
                    "on" : onCanvas,
                    "originalAnnoID" : "",
                    "version" : 1,
                    "permission" : 0,
                    "forkFromID" : "",
                    "resources" : [],
                    "proj" : projID
                };
                var url2 = "saveNewTransLineServlet";
                var params2 = {"content": JSON.stringify(newAnnoList)};
                $.post(url2, params2, function(data){ //save new list
                    data = JSON.parse(data);
                    var newAnnoListCopy = newAnnoList;
                    newAnnoListCopy["@id"] = data["@id"];
                    currentFolio = parseInt(currentFolio);
                    tpen.manifest.sequences[0].canvases[tpen.screen.currentFolio].otherContent.push(newAnnoListCopy);
                    var url3 = "updateAnnoList";
                    var paramObj3 = {"@id":newAnnoListCopy["@id"], "resources": [dbLine]};
                    var params3 = {"content":JSON.stringify(paramObj3)};
                    $.post(url3, params3, function(data){
                        $(".newColumn").attr({
                            "lineserverid" : dbLine["@id"],
                            "startid" : dbLine["@id"],
                            "endid" : dbLine["@id"],
                            "linenum" : $(".parsing").length
                        }).removeClass("newColumn");
                        newLine.attr("lineserverid", dbLine["@id"]);
                        $("#parsingCover").hide();
                    });
                });
            }
            else if (currentAnnoList == "noList"){
                //noList is a special scenario for handling classic T-PEN objects.
                if (beforeIndex == - 1){ //New line vs new column
                    $(".newColumn").attr({
                        "lineserverid" : dbLine["@id"],
                        "startid" : dbLine["@id"],
                        "endid" : dbLine["@id"],
                        "linenum" : $(".parsing").length
                    }).removeClass("newColumn");
                    currentFolio = parseInt(currentFolio);
                    tpen.manifest.sequences[0].canvases[currentFolio - 1].resources.push(dbLine);
                }
                else {
                    currentFolio = parseInt(currentFolio);
                    tpen.manifest.sequences[0].canvases[currentFolio - 1].resources.splice(beforeIndex + 1, 0, dbLine);
                }
                $("#parsingCover").hide();
                // QUERY: should we write to the DB here?  This would be in support of old data.
            }
            cleanupTranscriptlets(true);
        });
    }
    else{
        throw new Error("Cannot save line.  Canvas id is not present.");
    }
}

/**
 * Inserts new transcriptlet when line is added.
 * Cleans up inter-transcriptlet relationships afterwards.
 *
 * @param e line element to build transcriptlet from
 * @param afterThisID lineid of line before new transcriptlet
 * @param newLineID lineid of new line
 */
function buildTranscriptlet(e, afterThisID, newServerID){
    var newLineID = $(".transcriptlet").length + 1;
    var isNotColumn = true;
    var newW = e.attr("linewidth");
    var newX = e.attr("lineleft");
    var newY = e.attr("linetop");
    var newH = e.attr("lineheight");
    if (afterThisID === - 1) {
        // new column, find its placement
        afterThisID = $(".transcriptlet").eq( - 1).attr("lineserverid") || - 1;
        $(".transcriptlet").each(function(index) {
            if ($(this).find('lineLeft') > newX) {
                afterThisID = (index > 0) ? $(this).prev('.transcriptlet').attr("lineserverid") : - 1;
                return false;
            }
        });
        isNotColumn = false;
    }
    var $afterThis = $(".transcriptlet[lineserverid='" + afterThisID + "']");
    var newTranscriptlet = [
        "<div class='transcriptlet transcriptletBefore' id='transciptlet_", newLineID,
        "' lineserverid='", newServerID, // took out style DEBUG
        "lineheight= ", newH,
        "linewidth= ", newW,
        "linetop= ", newY,
        "lineleft= ", newX,
        "lineid= ", ,
        "col= ", ,
        "collinenum= ", ,
        "'>\n",
        "<span class='counter wLeft ui-corner-all ui-state-active ui-button'>Inserted Line</span>\n",
        "<textarea></textarea>\n",
        "</div>"].join("");
    if (isNotColumn){
        //update transcriptlet that was split
        $afterThis.after(newTranscriptlet).find(".lineHeight")
            .val($(".parsing[lineserverid='" + afterThisID + "']")
            .attr("lineheight"));
    }
    else {
        if (afterThisID === - 1) {
            $("#entry").prepend(newTranscriptlet.join(""));
        }
        else {
            $afterThis.after(newTranscriptlet.join(""));
        }
    }
    $(e).attr("lineserverid", newServerID);
}

/**
 * Adds a line by splitting the current line where it was clicked.
 *
 * @param e clicked line element
 * @see organizePage(e)
 */
function splitLine(e, event){
    //e is the line that was clicked in
    //This is where the click happened relative to img top.  In other words, where the click happened among the lines.
    var originalLineHeight = $(e).height(); //-1 take one px off for the border
    $(".parsing").attr("newline", "false");
    var originalLineTop = $(e).offset().top - $("#imgTop").offset().top; // +1 Move down one px for the border.
    var clickInLines = event.pageY - $("#imgTop").offset().top;
    var lineOffset = $(e).offset().top - $("#imgTop").offset().top;
    var oldLineHeight = (clickInLines - lineOffset) / $("#imgTop").height() * 100;
    var newLineHeight = (originalLineHeight - (clickInLines - originalLineTop)) / $("#imgTop").height() * 100;
    var newLineTop = (clickInLines / $("#imgTop").height()) * 100;
    var newLine = $(e).clone(true);
    $(e).css({
        "height"    :   oldLineHeight + "%"
    }).attr({
        "newline"   :   true,
        "lineheight" :  oldLineHeight
    });
    $(newLine).css({
        "height"    :   newLineHeight + "%",
        "top"       :   newLineTop + "%"
    }).attr({
        "newline"   :   true,
        "linetop"   :   newLineTop,
        "lineheight" : newLineHeight
    });
    $(e).after(newLine);
    var newNum = - 1;
    $.each($(".parsing"), function(){
        newNum++;
        $(this).attr("linenum", newNum);
    });
    saveNewLine($(e), newLine);
    $("#progress").html("Line Added").fadeIn(1000).delay(3000).fadeOut(1000);
}

/**
 * Removes clicked line, merges if possible with the following line.
 * updateLine(e,additionalParameters) handles the original, resized line.
 *
 * @param e clicked line element from lineChange(e) via saveNewLine(e)
 * @see lineChange(e)
 * @see saveNewLine(e)
 */
function removeLine(e, columnDelete){
    $("#imageTip").hide();
    var removedLine = $(e);
    if (columnDelete){
        var lineID = "";
        removedLine.remove();
        return false;
    }
    else {
        if ($(e).attr("lineleft") == $(e).next(".parsing").attr("lineleft")) {
            removedLine = $(e).next();
            var removedLineHeight = removedLine.height();
            var currentLineHeight = $(e).height();
            var newLineHeight = removedLineHeight + currentLineHeight;
            var convertedNewLineHeight = newLineHeight / $("#imgTop").height() * 100;
            $(e).css({
                "height" :  convertedNewLineHeight + "%",
                "top" :     $(e).css("top")
            }).addClass("newDiv").attr({
                "lineheight":   convertedNewLineHeight
            });
        } else if ($(e).hasClass("deletable")){
            var cfrm = confirm("Removing this line will remove any data contained as well.\n\nContinue?");
            if (!cfrm){
                $("#parsingCover").hide();
                return false;
            }
            tpen.screen.isDestroyingLine = true;
        }
        var params = new Array({name:"remove", value:removedLine.attr("lineserverid")});
        removedLine.remove();
        removeTranscriptlet(removedLine.attr("lineserverid"), $(e).attr("lineserverid"), true, "cover");
        return params;
    }
}

/**
 * Removes transcriptlet when line is removed. Updates transcriplet
 * if line has been merged with previous.
 *
 * @param lineid lineid to remove
 * @param updatedLineID lineid to be updated
 */
function removeTranscriptlet(lineid, updatedLineID, draw, cover){
    //update remaining line, if needed
    $("#parsingCover").show();
    var updateText = "";
    var removeNextLine = false;
    if (lineid !== updatedLineID){
        removeNextLine = true;
        var updatedLine = $(".parsing[lineserverid='" + updatedLineID + "']");
        var removedLine1 = $(".parsing[lineserverid='" + lineid + "']");
        var removedLine2 = $(".transcriptlet[lineserverid='" + lineid + "']");
        var toUpdate = $(".transcriptlet[lineserverid='" + updatedLineID + "']");
        var removedText = $(".transcriptlet[lineserverid='" + lineid + "']").find("textarea").val();
        toUpdate.find("textarea").val(function(){
            var thisValue = $(this).val();
            if (removedText !== undefined){
                if (removedText !== "") thisValue += (" " + removedText);
                updateText = thisValue;
            }
            return thisValue;
        });
        var lineHeightForUpdate = parseFloat(toUpdate.attr("lineheight")) + parseFloat(removedLine2.attr("lineheight"));
        toUpdate.attr("lineheight", lineHeightForUpdate);
    }
    else {
    }
    var index = - 1;
    currentFolio = parseInt(currentFolio);
    var currentAnnoList = annoLists[currentFolio - 1];
    if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){ // if it IIIF, we need to update the list
        var annosURL = "getAnno";
        var properties = {"@id": currentAnnoList};
        var paramOBJ = {"content": JSON.stringify(properties)};
        $.post(annosURL, paramOBJ, function(annoList){
            annoList = JSON.parse(annoList);
            var annoListID = currentAnnoList;
            currentAnnoList = annoList[0];
            $.each(currentAnnoList.resources, function(){
                index++;
                var lineIDToCheck = "";
                if (removeNextLine){
                    lineIDToCheck = lineid;
                    removedLine2.remove(); //remove the transcriptlet from UI
                }
                else{
                    lineIDToCheck = updatedLineID;
                }
                if (this["@id"] === lineIDToCheck){
                    currentAnnoList.resources.splice(index, 1);
                    var url = "updateAnnoList";
                    var paramObj = {"@id":annoListID, "resources": currentAnnoList.resources};
                    var params = {"content":JSON.stringify(paramObj)};
                    $.post(url, params, function(data){
                        currentFolio = parseInt(currentFolio);
                        annoLists[currentFolio - 1] = annoListID;
                        if (!removeNextLine){
                            $("#parsingCover").hide();
                        }
                        else {
                            updateLine(toUpdate);
                        }
                    });
                }
            });
        });
    }
    else if (currentAnnoList == "empty"){
        throw new Error("There is no anno list assosiated with this anno.  This is an error.");
    }
    else { // If it is classic T-PEN, we need to update canvas resources
        currentFolio = parseInt(currentFolio);
        $.each(tpen.manifest.sequences[0].canvases[currentFolio - 1].resources, function(){
            index++;
            if (this["@id"] == lineid){
                tpen.manifest.sequences[0].canvases[currentFolio - 1].resources.splice(index, 1);
                //update for real
            }
        });
    }
    //When it is just one line being removed, we need to redraw.  When its the whole column, we just delete.
    cleanupTranscriptlets(draw);
}

/* Remove all transcriptlets in a column */
function removeColumnTranscriptlets(lines, recurse){
    var index = - 1;
    currentFolio = parseInt(currentFolio);
    var currentAnnoList = annoLists[currentFolio - 1];
    if (currentAnnoList !== "noList" && currentAnnoList !== "empty"){
        // if it IIIF, we need to update the list
        var annosURL = "getAnno";
        var properties = {"@id": currentAnnoList};
        var paramOBJ = {"content": JSON.stringify(properties)};
        $.post(annosURL, paramOBJ, function(annoList){
            annoList = JSON.parse(annoList);
            var annoListID = currentAnnoList;
            currentAnnoList = annoList[0];
            for (var l = lines.length - 1; l >= 0; l--){
                var theLine = $(lines[l]);
                var index2 = - 1;
                $.each(currentAnnoList.resources, function(){
                    var currentResource = this;
                    index2++;
                    if (currentResource["@id"] == theLine.attr("lineserverid")){
                        currentAnnoList.resources.splice(index2, 1);
                        theLine.remove();
                    }
                });
                if (l === 0){
                    var url = "updateAnnoList";
                    var paramObj = {"@id":annoListID, "resources": currentAnnoList.resources};
                    var params = {"content":JSON.stringify(paramObj)};
                    $.post(url, params, function(data){
                        annoLists[currentFolio - 1] = annoListID;
                        if (recurse){
                            nextColumnToRemove.remove();
                            destroyPage();
                        }
                        else{
                            cleanupTranscriptlets(true);
                        }
                    });
                }
            }
        });
    }
    else {
        //It was not a part of the list, but we can still cleanup the transcriptlets from the interface.  This could happen when a object is fed to the
        //transcription textarea who instead of using an annotation list used the resources[] field to store anno objects directly with the canvas.
        //These changes will not save, they are purely UI manipulation.  An improper, view only object has been fed to the interface at this point, so this is intentional.
        for (var l = lines.length - 1; l >= 0; l--){
            var theLine = $(lines[l]);
            theLine.remove();
            var lineID = theLine.attr("lineserverid");
            $(".transcriptlet[lineserverid='" + lineID + "']").remove(); //remove the transcriptlet
            $(".lineColIndicator[lineserverid='" + lineID + "']").remove(); //Remove the line representing the transcriptlet
            $(".previewLineNumber[lineserverid='" + lineID + "']").parent().remove(); //Remove the line in text preview of transcription.
        }
    }
}

/* Re draw transcriptlets from the Annotation List information. */
function cleanupTranscriptlets(draw) {
    var transcriptlets = $(".transcriptlet");
    if (draw){
        transcriptlets.remove();
        $(".lineColIndicatorArea").children(".lineColIndicator").remove();
        $("#parsingSplit").find('.fullScreenTrans').unbind();
        $("#parsingSplit").find('.fullScreenTrans').bind("click", function(){
            fullPage();
            currentFolio = parseInt(currentFolio);
            drawLinesToCanvas(tpen.manifest.sequences[0].canvases[currentFolio - 1], "");
        });
    }
}

/* Make some invalid information inside of folios valid empties */
function scrubFolios(){
    //you could even force create anno lists off of the existing resource here if you would like.
    var cnt1 = - 1;
    $.each(tpen.manifest.sequences[0].canvases, function(){
        cnt1++;
        var canvasObj = this;
        if (canvasObj.resources && canvasObj.resources.length > 0){
            if (canvasObj.images === undefined || canvasObj.images === null){
                canvasObj.images = [];
            }
            var cnt2 = - 1;
            $.each(canvasObj.resources, function(){
                cnt2 += 1;
                if (this.resource && this.resource["@type"] && this.resource["@type"] === "dctypes:Image"){
                    canvasObj.images.push(this);
                    canvasObj.resources.splice(cnt2, 1);
                    tpen.manifest.sequences[0].canvases[cnt1] = canvasObj;
                }
            });
        }
        if (canvasObj.otherContent === undefined){
            tpen.manifest.sequences[0].canvases[cnt1].otherContent = [];
        }
    });
}

/* Control the hiding and showing of the image tools in the transcription interface. */
function toggleImgTools(){
    if ($("#imageTools").attr("class") !== undefined && $("#imageTools").attr("class").indexOf("activeTools") > - 1){
        $('.toolWrap').hide();
        $("#imageTools").removeClass("activeTools");
        $("#activeImageTool").children("i").css("transform", "rotate(180deg)");
    }
    else{
        $("#imageTools").addClass("activeTools");
        $('.toolWrap').show();
        $("#activeImageTool").children("i").css("transform", "rotate(0deg)");
    }
}

function stopMagnify(){
    tpen.screen.isMagnifying = false;
    tpen.screen.zoomMultiplier = 2;
    $(document).off("mousemove");
    $("#zoomDiv").removeClass("ui-state-active");
    $("#zoomDiv").hide();
    $(".magnifyBtn").removeClass("ui-state-active");
    $("#magnifyTools").fadeOut(800);
    $(".lineColIndicatorArea").show();
    $(".magnifyHelp").hide();
    $("button[magnifyimg='full']").removeClass("selected");
    $("button[magnifyimg='compare']").removeClass("selected");
    $("button[magnifyimg='trans']").removeClass("selected");
    restoreWorkspace();
}

/*
 * Load all included Iframes on the page.  This function should be strategically placed so that the Iframes load after user and project information
 * are gathered.  This should help avoid timeouts caused by embedded Iframes wait times mixed with many calls to the annotation store and calls for images.
 * See the Network console in the Browser deveoper tools for problems with wait times on embedded content.
 *
 * @see newberryTrans.html to find the iframe elements.
 */
function loadIframes(){
    $.each($("iframe"), function(){
        var src = $(this).attr("data_src");
        $(this).attr("src", src);
    });
}

// Shim console.log to avoid blowing up browsers without it - daQuoi?
if (!window.console) window.console = {};
    if (!window.console.log) window.console.log = function () { };
