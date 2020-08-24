export class DWTForm extends FormApplication {
    constructor(actor = {}, activity = {}, editMode = false, ...args) {
        super(...args)
        game.users.apps.push(this)
        this.activity = activity;
        this.rollableEvents = [];
        if ("rollableEvents" in activity){
            this.rollableEvents = activity["rollableEvents"];
        }
        this.results = [];
        if ("results" in activity){
            this.results = activity["results"];
        }
        this.actor = actor;
        this.edit = editMode;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        if (this.edit){
            options.title = "Edit a Downtime Activity";
        } else {
            options.title = "Add a Downtime Event";
        }
        options.id = "downtime-ethck";
        options.template = "modules/downtime-ethck/templates/add-downtime-form.html";
        options.closeOnSubmit = true;
        options.popOut = true;
        options.width = 600;
        options.height = "auto";
        return options;
    }

    async getData() {
        // Return data to the template
        const abilities = CONFIG.DND5E.abilities;
        const saves = CONFIG.DND5E.abilities;
        const skills = CONFIG.DND5E.skills;

        const activity = this.activity;

        return {
            abilities,
            saves,
            skills,
            activity
        };
    }

    render(force, context={}) {
        // Only re-render if needed
        const {action, data} = context;
        return super.render(force, context);
  }

    activateListeners(html) {
        super.activateListeners(html);
        this.element.find(".addRollable").click((event) => this.handleRollables(event));
        this.element.find("#rollableEventsTable > tbody > .rollableEvent").on("click", "#deleteRollable", (event) => this.handleRollableDelete(event));
        this.element.find(".addResult").click((event) => this.handleResults(event));
        this.element.find("#resultsTable > tbody > .result").on("click", "#deleteResult", (event) => this.handleResultDelete(event));
    }

    handleRollableDelete(event){
        event.preventDefault();
        const elem = $(event.currentTarget).parent().parent();
        const toDel = this.rollableEvents.find(rbl => rbl[2] == elem.attr("id"));
        const idx = this.rollableEvents.indexOf(toDel);
        this.rollableEvents.splice(idx, 1);
        elem.remove();
    }

    handleRollables(event) {
        event.preventDefault();

        const abiElem = this.element.find("#abiCheck");
        const saveElem = this.element.find("#saveSelect");
        const skiElem = this.element.find("#skiCheck");
        const dcElem = this.element.find("#dc");

        const abi = abiElem.val();
        const save = saveElem.val();
        const ski = skiElem.val();
        const dc = dcElem.val();

        let rbl = "";

        if (abi !== ""){
            rbl = abi;
        } else if (save !== ""){
            rbl = save;
        } else if (ski !== ""){
            rbl = ski;
        }

        if (dc === "" || rbl === "") {
            ui.notifications.error("ERROR! Select roll and DC first!");
            return
        }

        const time = Date.now();
        // Add event
        this.rollableEvents.push([rbl, dc, time]);
        // Add the row that shows in the form (DOM!)
        this.element.find("#rollableEventsTable").append(`
            <tr id="`+time+`" class="rollableEvent">
                <td><label>`+rbl+`</label></td>
                <td><label>`+dc+`</label></td>
                <td style="text-align:center;"><a class="item-control training-delete" id="deleteRollable" title="Delete">
                    <i class="fas fa-trash"></i></a>
                </td>
            </tr>`)

        //reset to initial vals
        abiElem.val($("#abiCheck option:first").val())
        saveElem.val($("#saveSelect option:first").val())
        skiElem.val($("#skiCheck option:first").val())
        dcElem.val($("#dc option:first").val())
    }

    handleResultDelete(event){
        event.preventDefault();
        const elem = $(event.currentTarget).parent().parent();
        const toDel = this.results.find(res => res[3] == elem.attr("id"));
        const idx = this.results.indexOf(toDel);
        this.results.splice(idx, 1)
        elem.remove(); 
    }

    handleResults(event) {
        event.preventDefault();

        const min = this.element.find("#resultMin");
        const max = this.element.find("#resultMax");
        const text = this.element.find("#resultText");

        const minV = min.val();
        const maxV = max.val();
        const textV = text.val();

        if (minV === "" || maxV === "" || textV === "") {
            ui.notifications.error("Fill in min, max, and text before submission.");
            return;
        } else if (isNaN(minV) || isNaN(maxV)) {
            ui.notifications.error("Min and Max only accept numbers.");
            return;
        }

        const time = Date.now();
        // Add event
        this.results.push([parseInt(minV), parseInt(maxV), textV, time]);
        // Add the row that shows in the form (DOM!)
        this.element.find("#resultsTable").append(`
            <tr id="`+time+`" class="result">
                <td><label>`+minV+`</label></td>
                <td><label>`+maxV+`</label></td>
                <td><label>`+textV+`</label></td>
                <td style="text-align:center;"><a class="item-control training-delete" id="deleteResult" title="Delete">
                    <i class="fas fa-trash"></i></a>
                </td>
            </tr>`)

        //reset to initial vals
        min.val("")
        max.val("")
        text.val("")
    }

    async _updateObject(event, formData) {
        const actName = this.element.find("#name").val();
        const actDesc = this.element.find("#desc").val();
        const actType = this.element.find("#succFailActivity:checked").val() || this.element.find("#categoryActivity:checked").val()
        let activity = {}
        if (!this.edit){
            activity = {
                name: actName || game.i18n.localize("C5ETRAINING.NewDowntimeActivity"),
                progress: 0,
                description: actDesc || "",
                changes: [],
                progressionStyle: 'complex',
                rollableEvents: this.rollableEvents,
                results: this.results,
                id: Date.now(),
                type: actType
            };
        } else {
            activity = this.activity;
            activity["name"] = actName;
            activity["description"] = actDesc;
            activity["rollableEvents"] = this.rollableEvents;
            activity["results"] = this.results;
            activity["type"] = actType;
        }

        const actor = this.actor;
        if (!(jQuery.isEmptyObject(actor))){
            const flags = actor.data.flags['downtime-ethck'];
            if (!this.edit){
                activity["world"] = false;
                // Update flags and actor
                flags.trainingItems.push(activity);
            }
            actor.update({'flags.downtime-ethck': null}).then(function(){
              actor.update({'flags.downtime-ethck': flags});
            });
        } else {
            activity["world"] = true;
            const settings = game.settings.get("downtime-ethck", "activities");
            //settings.push(activity)
            if (this.edit){
                let act = settings.find(act => act.id == activity.id);
                let idx = settings.indexOf(act);
                settings[idx] = activity;
            } else {
                settings.push(activity);
            }
            await game.settings.set("downtime-ethck", "activities", settings)
        }

    }
}

