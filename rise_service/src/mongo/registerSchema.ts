import { helper } from "../util/helper";
import { UserMongoModel } from "./schema/user/userSchema";

export function registerSchema() {
    helper.mongo.model(UserMongoModel.schemaName, UserMongoModel.gameSchema)
}