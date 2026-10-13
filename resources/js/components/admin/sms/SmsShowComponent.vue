<template>
    <div class="card">
        <div class="card-header">
            <h5>SMS Details</h5>
        </div>
        <div class="card-body" v-if="sms">
            <p><strong>Recipient:</strong> {{ sms.phone }}</p>
            <p><strong>Message:</strong> {{ sms.message }}</p>
            <p><strong>Status:</strong> {{ sms.status }}</p>
            <p><strong>Date Sent:</strong> {{ sms.created_at }}</p>
        </div>
        <div v-else class="p-3">Loading...</div>
    </div>
</template>

<script>
export default {
    name: "SmsShowComponent",
    data() {
        return {
            sms: null,
        };
    },
    mounted() {
        this.fetchSms();
    },
    methods: {
        async fetchSms() {
            try {
                const response = await axios.get(`/admin/sms/${this.$route.params.id}`);
                this.sms = response.data;
            } catch (error) {
                console.error("Failed to fetch SMS", error);
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
