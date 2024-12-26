import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { Variant } from "growtopia.js";

export default class Online extends Command {
  constructor(base: Base, peer: Peer, text: string, args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      command: ["online"],
      description: "Shows current online players",
      cooldown: 5,
      ratelimit: 1,
      category: "`oBasic",
      usage: "/online",
      example: ["/online"],
      permission: [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    this.peer.send(Variant.from("OnConsoleMessage", `Total online players: ${this.base.getOnlinePlayers()}`));
  }
}
