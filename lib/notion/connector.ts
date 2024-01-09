import { Client } from '@notionhq/client';
import { CreatePageResponse, QueryDatabaseResponse, CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import env from '../../env';
import debug from 'debug';

const ll = debug('notionbot::notionConnector');

const notion = new Client({
    auth: env!.NOTION_TOKEN,
});

const taskDB = env!.NOTION_TASK_DB;

export default {
    createTask: function (title: string, status: string, client: string, date: string, user: string, tgAuthor: number): Promise<CreatePageResponse> {
        
        ll('creating task', title, 'from', tgAuthor);

        var data: CreatePageParameters = {
            parent: {
                database_id: taskDB
            },
            properties: {
                Name: {
                    type: "title",
                    title: [
                        {
                            type: "text",
                            text: {
                                content: title
                            }
                        }
                    ]
                },
                Performers: {
                    type: "people",
                    people: [
                        {
                            id: user
                        }
                    ]
                },
                Tags: {
                    type: 'status',
                    status: {
                        name: status==''?'Не начато':status
                    }
                },
                'Дедлайн': {
                    type: 'date',
                    date: {
                        start: date
                    }
                }
            }
        }

        if (client) {
            data['properties']['Клиент'] = {
                type: 'relation',
                relation: [
                    {
                        id: client
                    }
                ]
            }
        }
        
        return notion.pages.create(data);
    },
    convertTaskToUrl: function (task: CreatePageResponse): string {
        return task.id.replace(/-/g, ''); // конвертируем id в рабочий для ссылки
    },
    getClients: function (client: string): Promise<QueryDatabaseResponse> {
        return notion.databases.query({
            database_id: '',
            filter: {
                property: 'Клиент',
                title: {
                  contains: client
                }
            }
        });
    }
};
