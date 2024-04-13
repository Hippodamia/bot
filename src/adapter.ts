import {Bot} from "./bot";

/**
 * 用于收发消息的适配器
 * - 适配器需要实现`send`方法，用于发送消息
 * - 适配器可以实现`init`方法，用于初始化适配器
 * - 适配器可以实现`info`属性，用于描述适配器的基本信息
 */
export interface Adapter {

    /**
     * 适配器的基本信息
     */
    info: {
        /** 适配器的版本 */
        version: string,
        /** 适配器的名称 */
        name: string,
        /** 适配器的描述 */
        desc: string
    }

    /**
     * 
     * @param content 待发送的内容
     * @param target 
     */
    send(content: string, target: { channel?: string, user?: string }): void

    /**
     * 初始化适配器
     * 适配器会在load后自动被bot初始化init方法
     * @param bot 
     */
    init?(bot: Bot): void;
}
