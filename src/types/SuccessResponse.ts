import { Field, ObjectType } from 'type-graphql'

@ObjectType()
export class SuccessResponse {
    constructor(success: boolean) {
        this.success = success
    }

    @Field()
    success!: boolean
}
