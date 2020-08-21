// Imports
import { preloadTemplates } from "./load-templates.js";
import AuditLog from "./audit-log.js";
import { DWTForm} from "./downtime.js";

// Register Handlebars Helpers
Handlebars.registerHelper("trainingCompletion", function(trainingItem) {
  let percentComplete = Math.min(100,(100 * trainingItem.progress / trainingItem.completionAt)).toFixed(0);
  return percentComplete;
});

Handlebars.registerHelper("progressionStyle", function(trainingItem) {
  let progressionTypeString = "";
  if(trainingItem.progressionStyle === "simple"){
    progressionTypeString = game.i18n.localize("C5ETRAINING.Simple");
  } else if(trainingItem.progressionStyle === "ability"){
    progressionTypeString = getAbilityName(trainingItem.ability);
  } else if(trainingItem.progressionStyle === "dc"){
    progressionTypeString = getAbilityName(trainingItem.ability)+" (" + game.i18n.localize("C5ETRAINING.DC") + trainingItem.dc + ")";
  } else if (trainingItem.progressionStyle == "complex"){
    progressionTypeString = "Complex";
  }
    return progressionTypeString;
  }
);

// Register Game Settings
Hooks.once("init", () => {
  preloadTemplates();

  game.settings.registerMenu("downtime-ethck", "config", {
        name: "Config",
        label: "Access Config Menu",
        hint: "Access the configuration menu to find additional options.",
        icon: "fas fa-desktop",
        type: DWTForm,
        restricted: true
    });

  game.settings.register("downtime-ethck", "enableTraining", {
    name: game.i18n.localize("C5ETRAINING.ShowDowntimeTabPc"),
    hint: game.i18n.localize("C5ETRAINING.ShowDowntimeTabPcHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("downtime-ethck", "enableTrainingNpc", {
    name: game.i18n.localize("C5ETRAINING.ShowDowntimeTabNpc"),
    hint: game.i18n.localize("C5ETRAINING.ShowDowntimeTabNpcHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("downtime-ethck", "tabName", {
    name: game.i18n.localize("C5ETRAINING.DowntimeTabName"),
    hint: game.i18n.localize("C5ETRAINING.DowntimeTabNameHint"),
    scope: "world",
    config: true,
    default: "Downtime",
    type: String
  });

  game.settings.register("downtime-ethck", "defaultAbility", {
    name: game.i18n.localize("C5ETRAINING.DefaultAbility"),
    hint: game.i18n.localize("C5ETRAINING.DefaultAbilityHint"),
    scope: "world",
    config: true,
    type: String,
    choices: {
      "str": game.i18n.localize("C5ETRAINING.AbilityStr"),
      "dex": game.i18n.localize("C5ETRAINING.AbilityDex"),
      "con": game.i18n.localize("C5ETRAINING.AbilityCon"),
      "int": game.i18n.localize("C5ETRAINING.AbilityInt"),
      "wis": game.i18n.localize("C5ETRAINING.AbilityWis"),
      "cha": game.i18n.localize("C5ETRAINING.AbilityCha"),
      "acr": game.i18n.localize("C5ETRAINING.SkillAcr"),
      "ani": game.i18n.localize("C5ETRAINING.SkillAni"),
      "arc": game.i18n.localize("C5ETRAINING.SkillArc"),
      "ath": game.i18n.localize("C5ETRAINING.SkillAth"),
      "dec": game.i18n.localize("C5ETRAINING.SkillDec"),
      "his": game.i18n.localize("C5ETRAINING.SkillHis"),
      "ins": game.i18n.localize("C5ETRAINING.SkillIns"),
      "inv": game.i18n.localize("C5ETRAINING.SkillInv"),
      "itm": game.i18n.localize("C5ETRAINING.SkillItm"),
      "med": game.i18n.localize("C5ETRAINING.SkillMed"),
      "nat": game.i18n.localize("C5ETRAINING.SkillNat"),
      "per": game.i18n.localize("C5ETRAINING.SkillPer"),
      "prc": game.i18n.localize("C5ETRAINING.SkillPrc"),
      "prf": game.i18n.localize("C5ETRAINING.SkillPrf"),
      "rel": game.i18n.localize("C5ETRAINING.SkillRel"),
      "slt": game.i18n.localize("C5ETRAINING.SkillSlt"),
      "ste": game.i18n.localize("C5ETRAINING.SkillSte"),
      "sur": game.i18n.localize("C5ETRAINING.SkillSur")
    },
    default: "int",
  });

  game.settings.register("downtime-ethck", "totalToComplete", {
    name: game.i18n.localize("C5ETRAINING.DefaultAbilityCompletion"),
    hint: game.i18n.localize("C5ETRAINING.DefaultAbilityCompletionHint"),
    scope: "world",
    config: true,
    default: 300,
    type: Number
  });

  game.settings.register("downtime-ethck", "attemptsToComplete", {
    name: game.i18n.localize("C5ETRAINING.DefaultSimpleCompletion"),
    hint: game.i18n.localize("C5ETRAINING.DefaultSimpleCompletionHint"),
    scope: "world",
    config: true,
    default: 10,
    type: Number
  });

  game.settings.register("downtime-ethck", "defaultDcDifficulty", {
    name: game.i18n.localize("C5ETRAINING.DefaultDcDifficulty"),
    hint: game.i18n.localize("C5ETRAINING.DefaultDcDifficultyHint"),
    scope: "world",
    config: true,
    default: 10,
    type: Number
  });

  game.settings.register("downtime-ethck", "defaultDcSuccesses", {
    name: game.i18n.localize("C5ETRAINING.DefaultDcSuccesses"),
    hint: game.i18n.localize("C5ETRAINING.DefaultDcSuccessesHint"),
    scope: "world",
    config: true,
    default: 5,
    type: Number
  });

  // IF ABOUT TIME IS ENABLED
  // game.settings.register("downtime-ethck", "timeToComplete", {
  //   name: game.i18n.localize("C5ETRAINING.DefaultTimeCompletion"),
  //   hint: game.i18n.localize("C5ETRAINING.DefaultTimeCompletionHint"),
  //   scope: "world",
  //   config: true,
  //   default: 30,
  //   type: Number
  // });

  // IF ABOUT TIME IS ENABLED
  // game.settings.register("downtime-ethck", "enableDowntimeReminders", {
  //   name: game.i18n.localize("C5ETRAINING.EnableDowntimeReminders"),
  //   hint: game.i18n.localize("C5ETRAINING.EnableDowntimeRemindersHint"),
  //   scope: "world",
  //   config: true,
  //   default: false,
  //   type: Boolean
  // });

  game.settings.register("downtime-ethck", "announceCompletionFor", {
    name: game.i18n.localize("C5ETRAINING.AnnounceActivityCompletionFor"),
    hint: game.i18n.localize("C5ETRAINING.AnnounceActivityCompletionForHint"),
    scope: "world",
    config: true,
    type: String,
    choices: {
      "pc": game.i18n.localize("C5ETRAINING.PcsOnly"),
      "npc": game.i18n.localize("C5ETRAINING.NpcsOnly"),
      "both": game.i18n.localize("C5ETRAINING.PcsAndNpcs"),
      "none": game.i18n.localize("C5ETRAINING.None"),
    },
    default: "pc"
  });

  game.settings.register("downtime-ethck", "activities", {
    scope: "world",
    config: false,
    default: [],
  });

});


// The Meat And Potatoes
async function addTrainingTab(app, html, data) {

  // Determine if we should show the downtime tab
  let showTrainingTab = false;
  if(data.isCharacter){ showTrainingTab = game.settings.get("downtime-ethck", "enableTraining"); }
  else if(data.isNPC){ showTrainingTab = game.settings.get("downtime-ethck", "enableTrainingNpc"); }

  if (showTrainingTab){

    // Get our actor
    let actor = game.actors.entities.find(a => a.data._id === data.actor._id);
    // Make sure flags exist if they don't already
    if (actor.data.flags['downtime-ethck'] === undefined || actor.data.flags['downtime-ethck'] === null) {
      let trainingList = [];
      const flags = {trainingItems: trainingList};
      actor.data.flags['downtime-ethck'] = flags;
      actor.update({'flags.downtime-ethck': flags});
    }
    let flags = actor.data.flags['downtime-ethck'];

    // Update the nav menu
    let tabName = game.settings.get("downtime-ethck", "tabName");
    let trainingTabBtn = $('<a class="item" data-tab="training">' + tabName + '</a>');
    let tabs = html.find('.tabs[data-group="primary"]');
    tabs.append(trainingTabBtn);

    // Create the tab content
    let sheet = html.find('.sheet-body');
    console.log(data);
    let trainingTabHtml = $(await renderTemplate('modules/downtime-ethck/templates/training-section.html', {"activities": game.settings.get("downtime-ethck", "activities"), "actorAct": data}));
    sheet.append(trainingTabHtml);

    // Add New Downtime Activity
    html.find('.training-add').click(async (event) => {
      event.preventDefault();
      console.log("Ethck's Downtime Tracking | Create Downtime Activity excuted!");

      // Set up flags if they don't exist
      if (flags.trainingItems == undefined){
        flags.trainingItems = [];
      }

      let form = new DWTForm();
      form.render(true);
    });

    // Edit Downtime Activity
    html.find('.training-edit').click(async (event) => {
      event.preventDefault();
      console.log("Ethck's Downtime Tracking | Edit Downtime Activity excuted!");

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace('edit-',''));
      let activity = flags.trainingItems[trainingIdx];
      let form = new DWTForm(actor, activity, true);
      form.render(true);
    });

    // Remove Downtime Activity
    html.find('.training-delete').click(async (event) => {
      event.preventDefault();
      console.log("Ethck's Downtime Tracking | Delete Downtime Activity excuted!");

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace('delete-',''));
      let activity = flags.trainingItems[trainingIdx];
      let del = false;
      let dialogContent = await renderTemplate('modules/downtime-ethck/templates/delete-training-dialog.html');

      // Create dialog
      new Dialog({
        title: `Delete Downtime Activity`,
        content: dialogContent,
        buttons: {
          yes: {icon: "<i class='fas fa-check'></i>", label: game.i18n.localize("C5ETRAINING.Delete"), callback: () => del = true},
          no: {icon: "<i class='fas fa-times'></i>", label: game.i18n.localize("C5ETRAINING.Cancel"), callback: () => del = false},
        },
        default: "yes",
        close: html => {
          if (del) {
            // Delete item and update actor
            flags.trainingItems.splice(trainingIdx, 1);
            actor.update({'flags.downtime-ethck': null}).then(function(){
              actor.update({'flags.downtime-ethck': flags});
            });
          }
        }
      }).render(true);
    });

    // Edit Progression Value
    html.find('.training-override').change(async (event) => {
      event.preventDefault();
      console.log("Ethck's Downtime Tracking | Progression Override excuted!");

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let field = event.currentTarget;
      let trainingIdx = parseInt(fieldId.replace('override-',''));
      let activity = flags.trainingItems[trainingIdx];
      let adjustment = 0;

      // Format text field input and change
      if(isNaN(field.value)){
        ui.notifications.warn("Downtime Tracking: " + game.i18n.localize("C5ETRAINING.InvalidNumberWarning"));
      } else if(field.value.charAt(0)=="+"){
        let changeName = game.i18n.localize("C5ETRAINING.AdjustProgressValue") + " (+)";
        adjustment = parseInt(field.value.substr(1).trim());
        activity = calculateNewProgress(activity, changeName, adjustment);
      } else if (field.value.charAt(0)=="-"){
        let changeName = game.i18n.localize("C5ETRAINING.AdjustProgressValue") + " (-)";
        adjustment = 0 - parseInt(field.value.substr(1).trim());
        activity = calculateNewProgress(activity, changeName, adjustment);
      } else {
        let changeName = game.i18n.localize("C5ETRAINING.AdjustProgressValue") + " (=)";
        adjustment = parseInt(field.value);
        activity = calculateNewProgress(activity, changeName, adjustment, true);
      }

      // Log completion
      checkCompletion(actor, activity);

      // Update flags and actor
      flags.trainingItems[trainingIdx] = activity;
      actor.update({'flags.downtime-ethck': null}).then(function(){
        actor.update({'flags.downtime-ethck': flags});
      });
    });

    // Roll To Train
    html.find('.training-roll').click(async (event) => {
      event.preventDefault();
      console.log("Ethck's Downtime Tracking | Progress Downtime Activity excuted!");

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace('roll-',''));
      let activity = flags.trainingItems[trainingIdx];
      let abilities = ['str','dex','con','int','wis','con'];
      let skillRoll = !abilities.includes(activity.ability);

      // Progression Type: Ability Check or DC - ABILITY
      if (activity.ability && !skillRoll){
        let abilityName = getAbilityName(activity.ability);
        // Roll to increase progress
        actor.rollAbilityTest(activity.ability).then(function(r){
          let rollMode = getRollMode(r._formula);
          let attemptName = game.i18n.localize("C5ETRAINING.Roll") + " " + abilityName + " (" + rollMode + ")";
          // Increase progress
          activity = calculateNewProgress(activity, attemptName, r._total);
          // Log activity completion
          checkCompletion(actor, activity);
          // Update flags and actor
          flags.trainingItems[trainingIdx] = activity;
          actor.update({'flags.downtime-ethck': null}).then(function(){
            actor.update({'flags.downtime-ethck': flags});
          });
        });
      }
      // Progression Type: Ability Check or DC - SKILL
      else if (activity.ability && skillRoll){
        let abilityName = getAbilityName(activity.ability);
        // Roll to increase progress
        actor.rollSkill(activity.ability).then(function(r){
          let rollMode = getRollMode(r._formula);
          let attemptName = game.i18n.localize("C5ETRAINING.Roll") + " " + abilityName + " (" + rollMode + ")";
          // Increase progress
          activity = calculateNewProgress(activity, attemptName, r._total);
          // Log activity completion
          checkCompletion(actor, activity);
          // Update flags and actor
          flags.trainingItems[trainingIdx] = activity;
          actor.update({'flags.downtime-ethck': null}).then(function(){
            actor.update({'flags.downtime-ethck': flags});
          });
        });
      }
      // Progression Type: Simple
      else if (activity.progressionStyle == 'simple'){
        let activityName = game.i18n.localize("C5ETRAINING.Attempt") + " (" + game.i18n.localize("C5ETRAINING.Simple") + ")";
        // Increase progress
        activity = calculateNewProgress(activity, activityName, 1);
        // Log activity completion
        checkCompletion(actor, activity);
        // Update flags and actor
        flags.trainingItems[trainingIdx] = activity;
        actor.update({'flags.downtime-ethck': null}).then(function(){
          actor.update({'flags.downtime-ethck': flags});
        });
      }
    });

    // Toggle Information Display
    // Modified version of _onItemSummary from dnd5e system located in
    // dnd5e/module/actor/sheets/base.js
    html.find('.training-toggle-desc').click(async (event) => {
      event.preventDefault();
      console.log("Ethck's Downtime Tracking | Toggle Acvtivity Info excuted!");

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace('toggle-desc-',''));
      let activity = flags.trainingItems[trainingIdx];
      let desc = activity.description || "";
      let li = $(event.currentTarget).parents(".item");

      if ( li.hasClass("expanded") ) {
        let summary = li.children(".item-summary");
        summary.slideUp(200, () => summary.remove());
      } else {
        let div = $(`<div class="item-summary">${desc}</div>`);
        li.append(div.hide());
        div.slideDown(200);
      }
      li.toggleClass("expanded");

    });

    // Review Changes
    html.find('.training-audit').click(async (event) => {
      event.preventDefault();
      console.log("Ethck's Downtime Tracking | GM Audit excuted!");
      new AuditLog(actor).render(true);
    });

    // Set Training Tab as Active
    html.find('.tabs .item[data-tab="training"]').click(ev => {
      app.activateTrainingTab = true;
    });

    // Unset Training Tab as Active
    html.find('.tabs .item:not(.tabs .item[data-tab="training"])').click(ev => {
      app.activateTrainingTab = false;
    });

  }

}
// Calculates the progress value of an activity and logs the change to the progress
// if absolute is true, set progress to the change value rather than adding to it
// RETURNS THE ENTIRE ACTIVITY
function calculateNewProgress(activity, actionName, change, absolute = false){

  let newProgress = 0;

  if(absolute){
    newProgress = change;
  } else {
    if(activity.dc){ //if there's a dc set
      if(change >= activity.dc){ //if the check beat the dc
        newProgress = activity.progress += 1; //increase the progress
      } else { //check didnt beat dc
        newProgress = activity.progress; //add nothing
      }
    } else { //if no dc set
      newProgress = activity.progress + change;
    }
  }

  if(newProgress > activity.completionAt){
    newProgress = activity.completionAt;
  } else if (newProgress < 0){
    newProgress = 0;
  }

  // Log activity change
  // Make sure flags exist and add them if they don't
  if (!activity.changes){
    activity.changes = [];
  }
  // Create and add new change to log
  let log = {
    timestamp: new Date(),
    actionName: actionName,
    valueChanged: "progress",
    oldValue: activity.progress,
    newValue: newProgress,
    user: game.user.name,
    note: ""
  }
  activity.changes.push(log);

  activity.progress = newProgress;
  return activity;
}

// Checks for completion of an activity and logs it if it's done
async function checkCompletion(actor, activity){
  if(activity.progress >= activity.completionAt){
    let alertFor = game.settings.get("downtime-ethck", "announceCompletionFor");
    let isPc = actor.isPC;
    let sendIt;

    switch(alertFor){
      case "none":
        sendIt = false;
        break;
      case "both":
        sendIt = true;
        break;
      case "npc":
        sendIt = !isPc;
        break
      case "pc":
        sendIt = isPc;
        break;
      default:
        sendIt = false;
    }

    if (sendIt){
      console.log("Ethck's Downtime Tracking | " + actor.name + " " + game.i18n.localize("C5ETRAINING.CompletedADowntimeActivity"));
      let chatHtml = await renderTemplate('modules/downtime-ethck/templates/completion-message.html', {actor:actor, activity:activity});
      ChatMessage.create({content: chatHtml});
    }
  }
}

// Takes in the die roll string and returns whether it was made at adv/disadv/normal
function getRollMode(formula){
  let d20Roll = formula.split(" ")[0];
  if(d20Roll == "2d20kh"){ return  game.i18n.localize("C5ETRAINING.Advantage"); }
  else if(d20Roll == "2d20kl"){ return game.i18n.localize("C5ETRAINING.Disadvantage"); }
  else { return game.i18n.localize("C5ETRAINING.Normal"); }
}

function getAbilityName(ability){
  let capitalized = ability.charAt(0).toUpperCase() + ability.slice(1);
  let abilities = ['str','dex','con','int','wis','con'];
  let isSkill = !abilities.includes(ability);
  let localizationKey = "C5ETRAINING.";
  if(isSkill){
    localizationKey = localizationKey + "Skill" + capitalized;
  } else {
    localizationKey = localizationKey + "Ability" + capitalized;
  }
  return game.i18n.localize(localizationKey);
}

Hooks.on(`renderActorSheet`, (app, html, data) => {
  addTrainingTab(app, html, data).then(function(){
    if (app.activateTrainingTab) {
      app._tabs[0].activate("training");
    }
  });
});
