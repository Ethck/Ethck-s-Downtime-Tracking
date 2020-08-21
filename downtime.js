export class DWTForm extends FormApplication {
    constructor(actor, ...args) {
        super(...args)
        game.users.apps.push(this)
        this.rollableEvents = [];
        this.actor = actor;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = "Add a Downtime Event";
        options.id = "downtime-ethck";
        options.template = "modules/downtime-ethck/templates/add-downtime-form.html";
        options.closeOnSubmit = true;
        options.popOut = true;
        options.width = 600;
        options.height = "auto";
        options.classes = ["lmrtfy", "lmrtfy-requestor"];
        return options;
    }

    async getData() {
        // Return data to the template
        const abilities = CONFIG.DND5E.abilities;
        const saves = CONFIG.DND5E.abilities;
        const skills = CONFIG.DND5E.skills;

        const rollableEvents = this.rollableEvents;

        return {
            abilities,
            saves,
            skills,
            rollableEvents
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
    }

    handleRollables(event) {
        event.preventDefault();

        const abi = this.element.find("#abiCheck").val();
        const save = this.element.find("#saveSelect").val();
        const ski = this.element.find("#skiCheck").val();
        const dc = this.element.find("#dc").val();

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

        this.rollableEvents.push([rbl, dc]);
        this.render(true);
    }

    async _updateObject(event, formData) {
        const newActivity = {
            name: game.i18n.localize("C5ETRAINING.NewDowntimeActivity"),
            progress: 0,
            description: "",
            changes: [],
            progressionStyle: 'complex',
            rollableEvents: this.rollableEvents
          };

        const actor = this.actor;
        const flags = actor.data.flags['downtime-ethck'];
        // Update flags and actor
        flags.trainingItems.push(newActivity);
        actor.update({'flags.downtime-ethck': null}).then(function(){
          actor.update({'flags.downtime-ethck': flags});
        });


    }
}

