// Imports
import AuditLog from "./audit-log.js";
import { DWTForm } from "./downtime.js";
import { GMConfig } from "./gmConfig.js";
import { ChooseRoll } from "./chooseRoll.js";

// Register Game Settings
Hooks.once("init", () => {
  game.settings.registerMenu("downtime-ethck", "config", {
    name: "Config",
    label: "Access Config Menu",
    hint: "Access the configuration menu to find additional options.",
    icon: "fas fa-desktop",
    type: GMConfig,
    restricted: true,
  });

  game.settings.register("downtime-ethck", "enableTraining", {
    name: "Show Training Tab on PCs",
    hint: "Display the training tab for Player Characters",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("downtime-ethck", "enableTrainingNpc", {
    name: "Show Training Tab on NPCs",
    hint: "Display the training tab for Non-Player Characters",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("downtime-ethck", "tabName", {
    name: "Tab Name",
    hint: "Name for the custom downtime tab",
    scope: "world",
    config: true,
    default: "Downtime",
    type: String,
  });

  game.settings.register("downtime-ethck", "dcRollMode", {
    name: "DC Roll Mode",
    hint: "Roll Mode used when downtime activities' DCs are called",
    scope: "world",
    config: true,
    type: String,
    choices: {
      gmroll: "GM Roll (Player can see)",
      blindroll: "Blind Roll (Player can't see)",
    },
    default: "blindroll",
  });

  game.settings.register("downtime-ethck", "activities", {
    scope: "world",
    config: false,
    default: [],
  });

  game.settings.register("downtime-ethck", "changes", {
    scope: "world",
    config: false,
    default: {},
  });
});

// The Meat And Potatoes
async function addTrainingTab(app, html, data) {
  // Determine if we should show the downtime tab
  let showTrainingTab = false;
  if (data.isCharacter) {
    showTrainingTab = game.settings.get("downtime-ethck", "enableTraining");
  } else if (data.isNPC) {
    showTrainingTab = game.settings.get("downtime-ethck", "enableTrainingNpc");
  }

  if (showTrainingTab) {
    // Get our actor
    let actor = game.actors.entities.find((a) => a.data._id === data.actor._id);
    // Make sure flags exist if they don't already
    if (
      actor.data.flags["downtime-ethck"] === undefined ||
      actor.data.flags["downtime-ethck"] === null
    ) {
      let trainingList = [];
      const flags = { trainingItems: trainingList };
      actor.data.flags["downtime-ethck"] = flags;
      actor.update({ "flags.downtime-ethck": flags });
    }
    let flags = actor.data.flags["downtime-ethck"];

    // Update the nav menu
    let tabName = game.settings.get("downtime-ethck", "tabName");
    let trainingTabBtn = $(
      '<a class="item" data-tab="downtime">' + tabName + "</a>"
    );
    let tabs = html.find('.tabs[data-group="primary"]');
    tabs.append(trainingTabBtn);

    const skills = CONFIG.DND5E.skills;

    // Create the tab content
    let sheet = html.find(".sheet-body");
    let trainingTabHtml = $(
      await renderTemplate(
        "modules/downtime-ethck/templates/training-section.html",
        {
          activities: game.settings.get("downtime-ethck", "activities"),
          actorAct: data,
        }
      )
    );
    sheet.append(trainingTabHtml);

    // Add New Downtime Activity
    html.find(".training-add").click(async (event) => {
      event.preventDefault();

      // Set up flags if they don't exist
      if (flags.trainingItems == undefined) {
        flags.trainingItems = [];
      }

      let form = new DWTForm(actor);
      form.render(true);
    });

    // Edit Downtime Activity
    html.find(".training-edit").click(async (event) => {
      event.preventDefault();

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("edit-", ""));
      let activity = flags.trainingItems[trainingIdx];
      let form = new DWTForm(actor, activity, true);
      form.render(true);
    });

    // Remove Downtime Activity
    html.find(".training-delete").click(async (event) => {
      event.preventDefault();

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("delete-", ""));
      let activity = flags.trainingItems[trainingIdx];
      let del = false;
      let dialogContent = await renderTemplate(
        "modules/downtime-ethck/templates/delete-training-dialog.html"
      );

      // Create dialog
      new Dialog({
        title: `Delete Downtime Activity`,
        content: dialogContent,
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label:"Delete",
            callback: () => (del = true),
          },
          no: {
            icon: "<i class='fas fa-times'></i>",
            label: "Cancel",
            callback: () => (del = false),
          },
        },
        default: "yes",
        close: (html) => {
          if (del) {
            // Delete item and update actor
            flags.trainingItems.splice(trainingIdx, 1);
            actor.update({ "flags.downtime-ethck": null }).then(function () {
              actor.update({ "flags.downtime-ethck": flags });
            });
          }
        },
      }).render(true);
    });

    // Roll To Train
    html.find(".training-roll").click(async (event) => {
      event.preventDefault();

      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("roll-", ""));
      let activity = {};

      if ($(event.currentTarget).hasClass("localRoll")) {
        activity = flags.trainingItems[trainingIdx];
      } else if ($(event.currentTarget).hasClass("worldRoll")) {
        activity = game.settings.get("downtime-ethck", "activities")[
          trainingIdx
        ];
      }

      let res = [];

      if (activity.rollableGroups.length !== 1){
        // We have more than 1 group
        let rolls = [];
        if (activity.rollableGroups.every((rg) => rg.rolls.length <= 1)){ //No ORs in activity
          activity.rollableGroups.forEach((group) => {
            if (group.rolls.length >= 1){
              rolls.push(group.rolls[0])
            }
          });
        } else { // Some ORs in Activity
        let form = new ChooseRoll(actor, activity)
        const choices = await form.chooseRollDialog();
        for (let rg of activity.rollableGroups){
          for (let c of choices){
            const choice = rg.rolls.find(async (roll) => roll[2] === c)
            if (choice !== undefined){
              rolls.push(choice)
              break;
            }
          }
        }
        }

        let rollRes = rolls.map(async (roll) => {
          return await rollRollable(actor, activity, roll);
        })
        res.push(...await Promise.all(rollRes))
        outputRolls(actor, activity, event, trainingIdx, res);

      } else {
        const resPromises = activity.rollableGroups[0].rolls.map(async (roll) => {
          return await rollRollable(actor, activity, roll);
        });

        res.push(await Promise.all(resPromises));
        outputRolls(actor, activity, event, trainingIdx, res);
     }
  });

    // Toggle Information Display
    // Modified version of _onItemSummary from dnd5e system located in
    // dnd5e/module/actor/sheets/base.js
    html.find(".training-toggle-desc").click(async (event) => {
      event.preventDefault();
      // Set up some variables
      let flags = actor.data.flags["downtime-ethck"];
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("toggle-desc-", ""));
      let activity = {};

      if ($(event.currentTarget).hasClass("localRoll")) {
        activity = flags.trainingItems[trainingIdx];
      } else if ($(event.currentTarget).hasClass("worldRoll")) {
        activity = game.settings.get("downtime-ethck", "activities")[
          trainingIdx
        ];
      }

      let desc = "";
      for (let rollable of activity.rollableEvents) {
        desc += rollable[0] + " DC: " + rollable[1] + "</br>";
      }

      let li = $(event.currentTarget).parents(".item");

      if (li.hasClass("expanded")) {
        let summary = li.children(".item-summary");
        summary.slideUp(200, () => summary.remove());
      } else {
        let div = $(
          `<div class="item-summary"><label>` + desc + `</label></div>`
        );
        li.append(div.hide());
        div.slideDown(200);
      }
      li.toggleClass("expanded");
    });

    // Review Changes
    html.find(".training-audit").click(async (event) => {
      event.preventDefault();
      new AuditLog(actor).render(true);
    });

    // Set Training Tab as Active
    html.find('.tabs .item[data-tab="downtime"]').click((ev) => {
      app.activateDowntimeTab = true;
    });

    // Unset Training Tab as Active
    html
      .find('.tabs .item:not(.tabs .item[data-tab="downtime"])')
      .click((ev) => {
        app.activateDowntimeTab = false;
      });
  }
}

Hooks.on(`renderActorSheet`, (app, html, data) => {
  addTrainingTab(app, html, data).then(function () {
    if (app.activateDowntimeTab) {
      app._tabs[0].activate("downtime");
    }
  });
});

async function outputRolls(actor, activity, event, trainingIdx, res){
  let cmsg = "";

  if (activity.type === "succFail") {
    let booleanResults = [0, 0];
    res.map((pair) => {
      if (pair[0] >= pair[1]) {
        //Rolled is greater than dc
        booleanResults[0] += 1;
      } else {
        //Rolled is less than dc
        booleanResults[1] += 1;
      }
    });

    cmsg =
      "With " +
      booleanResults[0] +
      " successes and " +
      booleanResults[1] +
      " failures.";
    activity.results.forEach((result) => {
      if (
        result[0] <= booleanResults[0] &&
        result[1] >= booleanResults[0]
      ) {
        cmsg = cmsg + "</br>" + result[2];
      }
    });
  } else if (activity.type === "categories") {
    activity.results.forEach((result) => {
      if (res[0][0][0] >= result[0] && res[0][0][1] <= result[1]) {
        cmsg = "Result: " + result[2];
      }
    });
  }

  const cmsgTemplate = await renderTemplate("modules/downtime-ethck/templates/chatMessage.html", {img: activity.img, text: cmsg})

  ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: cmsgTemplate,
    flavor: "has completed the downtime activity of " + activity.name,
    type: CONST.CHAT_MESSAGE_TYPES.IC,
  });

  const timestamp = Date.now()

  const change = {
    timestamp: new Date(timestamp).toDateString(),
    user: game.user.name,
    activityName: activity.name,
    result: cmsg,
  }

  if ($(event.currentTarget).hasClass("localRoll")) {
    activity = flags.trainingItems[trainingIdx];
    if (flags.changes === undefined){
      flags.changes = [];
    }
    flags.changes.push(change)
    actor.update({ "flags.downtime-ethck": null }).then(function () {
    actor.update({ "flags.downtime-ethck": flags });
  });
  } else if ($(event.currentTarget).hasClass("worldRoll")) {
    activity = game.settings.get("downtime-ethck", "activities")[
      trainingIdx
    ];
    if (game.settings.get("downtime-ethck", "changes") === undefined){
      await game.settings.set("downtime-ethck", "changes", []);
    }
    let changes = game.settings.get("downtime-ethck", "changes");
    if (!(actor._id in changes)){
      changes[actor._id] = [];
    }
    changes[actor._id].push(change);
    await game.settings.set("downtime-ethck", "changes", changes);
  }
}

async function rollDC(rollable) {
  const rdc = new Roll(rollable[1]);
  const dcRoll = rdc.roll();
  dcRoll.toMessage(
    {},
    {
      rollMode: game.settings.get("downtime-ethck", "dcRollMode"),
      create: true,
    }
  );

  return dcRoll;
}

async function rollRollable(actor, activity, rollable) {
  let abilities = ["str", "dex", "con", "int", "wis", "cha"];
  const skills = CONFIG.DND5E.skills;
  let res = []

  if (rollable[0].includes("Check")) {
    let abiAcr = abilities.find((abi) =>
      rollable[0].toLowerCase().includes(abi)
    );
    await actor.rollAbilityTest(abiAcr).then(async (r) => {
      const dc = await rollDC(rollable);
      res = [r._total, dc._total];
    });
  } else if (rollable[0].includes("Save")) {
    let abiAcr = abilities.find((abi) =>
      rollable[0].toLowerCase().includes(abi)
    );
    await actor.rollAbilitySave(abiAcr).then(async (r) => {
      const dc = await rollDC(rollable);
      res = [r._total, dc._total];
    });
  } else {
    let skillAcr = Object.keys(skills).find((key) =>
      skills[key].toLowerCase().includes(rollable[0].toLowerCase())
    );
    await actor.rollSkill(skillAcr).then(async (r) => {
      const dc = await rollDC(rollable);
      res = [r._total, dc._total];
    });
  }

  return res;
}
