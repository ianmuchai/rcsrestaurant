<template>
    <div class="card">
        <div class="card-header">
            <h5>Send SMS to Customers</h5>
        </div>
        <div class="card-body">
            <form @submit.prevent="sendSms">
                <div class="form-group">
                    <label for="recipient">Recipient Phone Number</label>
                    <input
                        type="text"
                        id="recipient"
                        v-model="form.phone"
                        class="form-control"
                        placeholder="e.g. 2547XXXXXXXX"
                        required
                    />
                </div>
                <div class="form-group">
                    <label for="message">Message</label>
                    <textarea
                        id="message"
                        v-model="form.message"
                        class="form-control"
                        rows="4"
                        required
                    ></textarea>
                </div>
                <button type="submit" class="btn btn-primary">
                    Send SMS
                </button>
            </form>
        </div>

        <div class="card-footer">
            <h6>Recent SMS Logs</h6>
            <table class="table table-sm table-bordered">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Recipient</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="sms in smsLogs" :key="sms.id">
                    <td>{{ sms.id }}</td>
                    <td>{{ sms.phone }}</td>
                    <td>{{ sms.message }}</td>
                    <td>{{ sms.status }}</td>
                    <td>{{ sms.created_at }}</td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
export default {
    name: "SmsListComponent",
    data() {
        return {
            form: {
                phone: "",
                message: "",
            },
            smsLogs: [],
        };
    },
    mounted() {
        this.fetchSmsLogs();
    },
    methods: {
        async sendSms() {
            try {
                const response = await axios.post("/admin/sms", this.form);
                alert("SMS Sent!");
                this.form.phone = "";
                this.form.message = "";
                this.fetchSmsLogs();
            } catch (error) {
                console.error("Failed to send SMS", error);
                alert("Failed to send SMS");
            }
        },
        async fetchSmsLogs() {
            try {
                const response = await axios.get("/admin/sms");
                this.smsLogs = response.data;
            } catch (error) {
                console.error("Failed to fetch SMS logs", error);
            }
        },
    },
};
</script>

<style scoped>
.card {
    margin-top: 20px;
}
</style>
