import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { Variant } from "growtopia.js";

export default class Bot extends Command {
  constructor(base: Base, peer: Peer, text: string, args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      command: ["bot"],
      description: "Shows current online players",
      cooldown: 5,
      ratelimit: 1,
      category: "`bDev",
      usage: "/bot",
      example: ["/bot"],
      permission: [ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    this.peer.send(Variant.from({ delay: -1 }, "OnSpawn", `spawn|avatar\nnetID|55\nuserID|55\ncolrect|0|0|20|30\nposXY|${this.peer.data?.x}|${this.peer.data?.y}\nname|\`2BOT: Clark\`\`\ncountry|rt\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\ntype|global`));
  }
}
