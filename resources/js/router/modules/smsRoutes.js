import SmsComponent from "../../components/admin/sms/SmsComponent";
import SmsListComponent from "../../components/admin/sms/SmsListComponent";
import SmsShowComponent from "../../components/admin/sms/SmsShowComponent";

export default [
    {
        path: '/admin/sms',
        component: SmsComponent,
        name: 'admin.sms',
        redirect: { name: 'admin.sms.list' },
        meta: {
            isFrontend: false,
            auth: true,
            permissionUrl: 'sms',
            breadcrumb: 'sms'
        },
        children: [
            {
                path: '',
                component: SmsListComponent,
                name: 'admin.sms.list',
                meta: {
                    isFrontend: false,
                    auth: true,
                    permissionUrl: 'sms',
                    breadcrumb: ''
                },
            },
            {
                path: "show/:id",
                component: SmsShowComponent,
                name: "admin.sms.show",
                meta: {
                    isFrontend: false,
                    auth: true,
                    permissionUrl: "sms",
                    breadcrumb: "view",
                },
            },
        ]
    }
]
