const {SocketBase} = require("./socket");

class SocketQuest extends SocketBase {
    clientType = 'SOCKET_QUEST'

    // This method returns "true" when one or more connected users complete a quest step.
    async questStepComplete({internal_quest_step_id, credit_amount = 0, credit_message = null}) {
        const questResponse = await this.socket.emitWithAck(`r2cmr_${this.backend.robot_backend_id}`, {
            channel: "quest",
            internal_quest_step_id,
            credit_amount,
            credit_message
        }).catch(() => {})

        if(questResponse && questResponse.success && questResponse.quest_step_completed){
            return true
        }
    }
}

exports.SocketQuest = SocketQuest
